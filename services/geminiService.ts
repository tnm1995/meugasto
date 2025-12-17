
import { GoogleGenAI, Type } from "@google/genai";
import type { Expense, BankTransaction, Omit, Category } from '../types';

// Initialize the Gemini API client directly with the environment variable
const envApiKey = process.env.API_KEY;
const apiKey = (envApiKey && envApiKey.trim() !== '') ? envApiKey : 'dummy-key';
const ai = new GoogleGenAI({ apiKey: apiKey });

// Helper para limpar blocos de código Markdown (```json ... ```) da resposta
const cleanJsonString = (str: string) => {
  return str.replace(/```json|```/g, '').trim();
};

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
      description: `A Categoria Principal da despesa baseada na MAIORIA dos itens e no TIPO DE ESTABELECIMENTO.` 
    },
    subcategory: { 
      type: Type.STRING, 
      description: `A Subcategoria mais específica.` 
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

export const extractExpenseFromImage = async (base64Image: string, userCategories: Category[]): Promise<Omit<Expense, 'id'>> => {
  try {
    // Converte a lista de categorias do usuário para um formato que a IA entenda
    const expenseCats = userCategories.filter(c => c.type === 'expense');
    const categoriesContext = expenseCats
      .map((cat) => `${cat.name}: [${cat.subcategories.join(', ')}]`)
      .join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: `Você é um especialista em OCR e Contabilidade Brasileira.
        
        Analise esta imagem de cupom fiscal (NFC-e, SAT, Cupom) e extraia os dados.

        1. IDENTIFICAÇÃO DO LOCAL (CRÍTICO):
           - Encontre o Nome Fantasia da loja no topo.
           - Use o NOME DA LOJA para definir o contexto.

        2. EXTRAÇÃO DE ITENS:
           - Liste TODOS os itens.
           - Ignore códigos numéricos no início.
           - Preço deve ser o valor TOTAL do item.

        3. CATEGORIZAÇÃO INTELIGENTE:
           Use esta lista como referência estrita de categorias e subcategorias:
           ${categoriesContext}

           Regras:
           - Priorize a categoria do ESTABELECIMENTO.
           - Se for Restaurante/Lanchonete, use uma categoria de alimentação adequada.

        4. DADOS GERAIS:
           - Data: Formato YYYY-MM-DD.
           - Total: Valor final pago.
           - Pagamento: Crédito, Débito, Pix, Dinheiro, etc.
        
        Retorne APENAS o JSON válido conforme o schema.` }
      ] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: expenseResponseSchema,
      },
    });

    if (!response.text) {
        throw new Error('Resposta vazia da IA.');
    }

    const cleanedText = cleanJsonString(response.text);
    const parsedData = JSON.parse(cleanedText);
    
    // Validação e Fallback para Categorias dinâmicas
    let finalCategory = parsedData.category;
    let finalSubcategory = parsedData.subcategory;

    const userCatNames = expenseCats.map(c => c.name);
    
    if (!userCatNames.includes(finalCategory)) {
        // Tenta encontrar se a subcategoria existe em alguma categoria principal do usuário
        const foundCat = expenseCats.find(c => c.subcategories.includes(finalSubcategory));
        if (foundCat) {
            finalCategory = foundCat.name;
        } else {
            // Fallback para uma categoria existente ou 'Outros' se o usuário tiver
            finalCategory = userCatNames.includes('Outros') ? 'Outros' : (userCatNames[0] || 'Despesa');
            const catObj = expenseCats.find(c => c.name === finalCategory);
            finalSubcategory = (catObj && catObj.subcategories[0]) || 'Geral';
        }
    } else {
        const catObj = expenseCats.find(c => c.name === finalCategory);
        if (catObj && !catObj.subcategories.includes(finalSubcategory)) {
            finalSubcategory = catObj.subcategories[0] || 'Geral';
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
    if (errorMessage.includes('API key not valid') || error.status === 403 || error.status === 400 || errorMessage.includes('PERMISSION_DENIED')) {
        throw new Error('API_NOT_ENABLED');
    }
    throw new Error(`Erro ao processar imagem: ${errorMessage || 'Tente novamente.'}`);
  }
};

export const extractTransactionsFromPdfText = async (pdfText: string): Promise<BankTransaction[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: `Analise o texto deste extrato bancário e extraia as transações financeiras em JSON. Ignore saldos e cabeçalhos. Texto: ${pdfText}` }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: bankTransactionResponseSchema,
      },
    });
    
    if (!response.text) {
        return [];
    }

    const cleanedText = cleanJsonString(response.text);
    const parsedData = JSON.parse(cleanedText);
    return Array.isArray(parsedData) ? parsedData : [];

  } catch (error: any) {
    console.error('Gemini PDF Error:', error);
    const errorMessage = error.message || '';
    if (errorMessage.includes('API key not valid') || error.status === 403 || error.status === 400 || errorMessage.includes('PERMISSION_DENIED')) {
        throw new Error('API_NOT_ENABLED');
    }
    throw new Error('Erro ao processar PDF.');
  }
};
