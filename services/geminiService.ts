
import { GoogleGenAI, Type } from "@google/genai";
import type { Expense, BankTransaction, Omit } from '../types';
import { CATEGORIES } from '../types';

// Initialize the Gemini API client directly with the environment variable
// adhering to the requirement: const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
// Fallback to 'dummy-key' to prevent app crash on startup if key is missing.
// The API call will catch the invalid key error gracefully.
const apiKey = process.env.API_KEY || 'dummy-key';
const ai = new GoogleGenAI({ apiKey: apiKey });

// Cria uma representação de texto da árvore de categorias para o prompt
// Ex: "Alimentação: [Supermercado, Restaurante...], Transporte: [Combustível...]"
const categoriesContext = Object.entries(CATEGORIES)
  .map(([cat, subs]) => `${cat}: [${subs.join(', ')}]`)
  .join('\n');

const expenseResponseSchema = {
  type: Type.OBJECT,
  properties: {
    localName: { type: Type.STRING, description: "Nome do estabelecimento comercial." },
    purchaseDate: { type: Type.STRING, description: "Data da compra no formato YYYY-MM-DD. Se não encontrar o ano, assuma o ano atual." },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Nome limpo do produto (sem códigos iniciais como 001, 1234, etc)." },
          price: { type: Type.NUMBER, description: "Preço total do item (quantidade x valor unitário)." },
        },
        required: ['name', 'price'],
      },
      description: "Lista exata de todos os produtos comprados listados no cupom."
    },
    total: { type: Type.NUMBER, description: "Valor total final da nota fiscal." },
    category: { 
      type: Type.STRING, 
      description: `A Categoria Principal da despesa baseada na MAIORIA dos itens. Deve ser EXATAMENTE uma das chaves: ${Object.keys(CATEGORIES).join(', ')}` 
    },
    subcategory: { 
      type: Type.STRING, 
      description: `A Subcategoria mais específica. Deve ser EXATAMENTE uma das opções listadas dentro da Categoria escolhida.` 
    },
    paymentMethod: { type: Type.STRING, description: "Método de pagamento identificado (Crédito, Débito, Pix, Dinheiro, VR, etc)." }
  },
  required: ['localName', 'purchaseDate', 'total', 'category', 'subcategory', 'items'],
};

const bankTransactionResponseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      date: { type: Type.STRING },
      description: { type: Type.STRING },
      amount: { type: Type.NUMBER },
      type: { type: Type.STRING, enum: ['DEBIT', 'CREDIT'] },
    },
    required: ['date', 'description', 'amount', 'type'],
  },
};

export const extractExpenseFromImage = async (base64Image: string): Promise<Omit<Expense, 'id'>> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: `Você é um especialista em OCR de Cupons Fiscais Brasileiros (NFC-e, SAT, Cupom Fiscal).
        
        Sua tarefa é analisar a imagem e extrair os dados estruturados com precisão.
        
        1. ITENS (CRÍTICO): 
           - Liste TODOS os produtos visíveis no "Corpo" do cupom.
           - Ignore linhas de código (ex: "001", "789...") no início do nome. Ex: "001 LEITE" vira "LEITE".
           - O preço deve ser o valor TOTAL do item (Quantidade x Unitário).
        
        2. CATEGORIZAÇÃO:
           - Analise os itens extraídos.
           - Use a lista abaixo para classificar a despesa.
           - Se for um supermercado com itens variados (comida e limpeza), use "Alimentação" -> "Supermercado (Geral)".
           - Se for apenas itens de jardinagem, use "Moradia" -> "Jardinagem / Plantas".
           - Se for restaurante, use "Alimentação" -> "Restaurante / Almoço".
        
        ESTRUTURA DE CATEGORIAS VÁLIDAS:
        ${categoriesContext}
        
        3. DADOS GERAIS:
           - Local: Nome Fantasia da loja (topo do cupom).
           - Data: Data de emissão (procure por data/hora).
           - Total: Valor final pago.
           - Pagamento: Forma de pagamento (ex: Crédito, Pix).
        
        Retorne APENAS o JSON conforme o schema.` }
      ] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: expenseResponseSchema,
      },
    });

    if (!response.text) {
        throw new Error('Resposta vazia da IA.');
    }

    const parsedData = JSON.parse(response.text);
    
    // Validação e Fallback para Categorias
    let finalCategory = parsedData.category;
    let finalSubcategory = parsedData.subcategory;

    // Se a categoria retornada não existe na lista oficial, tenta corrigir ou usa 'Outros'
    if (!CATEGORIES[finalCategory]) {
        // Tenta encontrar se a subcategoria existe em alguma categoria principal
        const foundEntry = Object.entries(CATEGORIES).find(([_, subs]) => subs.includes(finalSubcategory));
        if (foundEntry) {
            finalCategory = foundEntry[0];
        } else {
            finalCategory = 'Outros';
            finalSubcategory = 'Não Identificado';
        }
    } else {
        // Se a categoria existe, verifica se a subcategoria é válida para ela
        if (!CATEGORIES[finalCategory].includes(finalSubcategory)) {
            // Se não for, usa a primeira subcategoria disponível (geralmente a mais genérica)
            finalSubcategory = CATEGORIES[finalCategory][0] || 'Outros';
        }
    }
    
    return {
        localName: parsedData.localName || 'Despesa Identificada',
        purchaseDate: parsedData.purchaseDate || new Date().toISOString().split('T')[0],
        items: Array.isArray(parsedData.items) ? parsedData.items : [],
        total: typeof parsedData.total === 'number' ? parsedData.total : 0,
        category: finalCategory,
        subcategory: finalSubcategory,
        isRecurring: false,
        paymentMethod: parsedData.paymentMethod || 'Outro',
        type: 'expense'
    };

  } catch (error: any) {
    console.error('Gemini Error Full:', JSON.stringify(error, null, 2));
    
    const errorMessage = error.message || '';
    
    // Identifica erro de API não habilitada ou chave inválida
    if (
        errorMessage.includes('API key not valid') || 
        errorMessage.includes('Generative Language API has not been used') || 
        error.status === 403 || 
        error.status === 400 || // API key not valid is often 400
        errorMessage.includes('PERMISSION_DENIED')
    ) {
        throw new Error('API_NOT_ENABLED');
    }

    throw new Error(`Erro ao processar imagem: ${errorMessage || 'Tente novamente.'}`);
  }
};

export const extractTransactionsFromPdfText = async (pdfText: string): Promise<BankTransaction[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: `Analise o texto deste extrato bancário e extraia as transações financeiras em JSON. Ignore saldos e cabeçalhos. Texto: ${pdfText}` }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: bankTransactionResponseSchema,
      },
    });
    
    if (!response.text) {
        return [];
    }

    const parsedData = JSON.parse(response.text);
    return Array.isArray(parsedData) ? parsedData : [];

  } catch (error: any) {
    console.error('Gemini PDF Error:', error);
    
    const errorMessage = error.message || '';

    // Identifica erro de API não habilitada
    if (
        errorMessage.includes('API key not valid') ||
        errorMessage.includes('Generative Language API has not been used') || 
        error.status === 403 || 
        error.status === 400 ||
        errorMessage.includes('PERMISSION_DENIED')
    ) {
        throw new Error('API_NOT_ENABLED');
    }

    throw new Error('Erro ao processar PDF.');
  }
};
