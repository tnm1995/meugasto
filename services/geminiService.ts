
import { GoogleGenAI, Type } from "@google/genai";
import type { Expense, BankTransaction, Omit } from '../types';
import { CATEGORIES } from '../types';

// Initialize the Gemini API client directly with the environment variable
// adhering to the requirement: const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
// Fallback to 'dummy-key' to prevent app crash on startup if key is missing.
// The API call will catch the invalid key error gracefully.
// NOTE: process.env.API_KEY is replaced by Vite at build time via define in vite.config.ts.
const envApiKey = process.env.API_KEY;
const apiKey = (envApiKey && envApiKey.trim() !== '') ? envApiKey : 'dummy-key';
const ai = new GoogleGenAI({ apiKey: apiKey });

// Helper para limpar blocos de código Markdown (```json ... ```) da resposta
const cleanJsonString = (str: string) => {
  return str.replace(/```json|```/g, '').trim();
};

// Cria uma representação de texto da árvore de categorias para o prompt
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

export const extractExpenseFromImage = async (base64Image: string): Promise<Omit<Expense, 'id'>> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: `Você é um especialista em OCR e Contabilidade Brasileira.
        
        Analise esta imagem de cupom fiscal (NFC-e, SAT, Cupom) e extraia os dados.

        1. IDENTIFICAÇÃO DO LOCAL (CRÍTICO):
           - Encontre o Nome Fantasia da loja no topo.
           - Use o NOME DA LOJA para definir o contexto.
           - Exemplo: "Centro de Jardinagem Junkes" -> O contexto é "Moradia" -> "Jardinagem / Plantas", mesmo que o item seja "Pimenta" (provavelmente uma muda).
           - Exemplo: "Loja dos Descontos" -> Analise os itens para decidir (provavelmente "Alimentação" -> "Supermercado" ou "Compras").

        2. EXTRAÇÃO DE ITENS:
           - Liste TODOS os itens.
           - Ignore códigos numéricos no início (ex: "001 PIMENTA" -> "PIMENTA").
           - Preço deve ser o valor TOTAL do item.

        3. CATEGORIZAÇÃO INTELIGENTE:
           Use esta lista como referência estrita:
           ${categoriesContext}

           Regras:
           - Priorize a categoria do ESTABELECIMENTO. Se for um posto de gasolina, é "Transporte" -> "Combustível", mesmo se comprou água.
           - Se for Restaurante/Lanchonete, use "Alimentação" -> "Restaurante / Almoço".

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
    
    // Validação e Fallback para Categorias
    let finalCategory = parsedData.category;
    let finalSubcategory = parsedData.subcategory;

    // Normalização básica se a IA alucinar categorias fora da lista
    if (!CATEGORIES[finalCategory]) {
        // Tenta encontrar se a subcategoria existe em alguma categoria principal
        const foundEntry = Object.entries(CATEGORIES).find(([_, subs]) => subs.includes(finalSubcategory));
        if (foundEntry) {
            finalCategory = foundEntry[0];
        } else {
            // Fallback inteligente baseado no nome do local se possível, ou Outros
            const local = (parsedData.localName || '').toLowerCase();
            if (local.includes('supermercado') || local.includes('atacad') || local.includes('market')) {
                finalCategory = 'Alimentação';
                finalSubcategory = 'Supermercado (Geral)';
            } else if (local.includes('jardin') || local.includes('flor')) {
                finalCategory = 'Moradia';
                finalSubcategory = 'Jardinagem / Plantas';
            } else if (local.includes('farma') || local.includes('drogaria')) {
                finalCategory = 'Saúde e Higiene';
                finalSubcategory = 'Farmácia / Medicamentos';
            } else if (local.includes('posto') || local.includes('combustivel')) {
                finalCategory = 'Transporte';
                finalSubcategory = 'Combustível';
            } else {
                finalCategory = 'Outros';
                finalSubcategory = 'Não Identificado';
            }
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

    const cleanedText = cleanJsonString(response.text);
    const parsedData = JSON.parse(cleanedText);
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
