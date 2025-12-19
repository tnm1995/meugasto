
import { GoogleGenAI, Type } from "@google/genai";
import type { Expense, BankTransaction, Omit } from '../types';
import { CATEGORIES } from '../types';

// Initialize the Gemini API client strictly with the environment variable per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
          name: { type: Type.STRING, description: "Nome limpo do produto (sem códigos iniciais)." },
          price: { type: Type.NUMBER, description: "Preço total do item." },
        },
        required: ['name', 'price'],
      },
      description: "Lista de produtos comprados."
    },
    total: { type: Type.NUMBER, description: "Valor total final da nota fiscal." },
    category: { 
      type: Type.STRING, 
      description: `A Categoria Principal da despesa.` 
    },
    subcategory: { 
      type: Type.STRING, 
      description: `A Subcategoria mais específica.` 
    },
    paymentMethod: { type: Type.STRING, description: "Forma de pagamento (Crédito, Débito, Pix, Dinheiro)." }
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
    // Update: Use gemini-3-flash-preview as recommended for text-based extraction tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: `Você é uma IA especializada em leitura de cupons fiscais brasileiros (NFC-e, SAT).
        
        Analise a imagem e extraia os dados com precisão:

        1. LOCAL: Nome fantasia do estabelecimento.
        2. DATA: Data da emissão (Converta para YYYY-MM-DD).
        3. ITENS: Liste os itens comprados com seus valores.
        4. CATEGORIA: Classifique baseado nesta lista:
           ${categoriesContext}
           
           *Contexto:* Se for posto de gasolina, category='Transporte', subcategory='Combustível'. Se for mercado, 'Alimentação'.
        
        5. TOTAL: O valor final pago.
        6. PAGAMENTO: Crédito, Débito, Pix, Dinheiro, etc.

        Retorne APENAS o JSON conforme o schema.` }
      ] },
      config: {
        responseMimeType: "application/json",
        responseSchema: expenseResponseSchema,
      },
    });

    if (!response.text) {
        throw new Error('Resposta vazia da IA.');
    }

    const cleanedText = cleanJsonString(response.text);
    const parsedData = JSON.parse(cleanedText);
    
    // Normalização e Fallback de Categorias
    let finalCategory = parsedData.category;
    let finalSubcategory = parsedData.subcategory;

    if (!CATEGORIES[finalCategory]) {
        // Tenta inferir pelo nome do local se a categoria vier errada
        const local = (parsedData.localName || '').toLowerCase();
        if (local.includes('supermercado') || local.includes('atacad') || local.includes('market')) {
            finalCategory = 'Alimentação';
            finalSubcategory = 'Supermercado (Geral)';
        } else if (local.includes('posto') || local.includes('combustivel') || local.includes('auto')) {
            finalCategory = 'Transporte';
            finalSubcategory = 'Combustível';
        } else if (local.includes('farma') || local.includes('drogaria')) {
            finalCategory = 'Saúde e Higiene';
            finalSubcategory = 'Farmácia / Medicamentos';
        } else {
            finalCategory = 'Outros';
            finalSubcategory = 'Não Identificado';
        }
    } else {
        if (!CATEGORIES[finalCategory].includes(finalSubcategory)) {
            finalSubcategory = CATEGORIES[finalCategory][0] || 'Outros';
        }
    }
    
    // Normaliza a data se vier DD/MM/YYYY por engano
    let finalDate = parsedData.purchaseDate;
    if (finalDate.includes('/')) {
       const parts = finalDate.split('/');
       if (parts.length === 3) {
           // Assume DD/MM/YYYY e converte para YYYY-MM-DD
           finalDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
       }
    }
    
    return {
        localName: parsedData.localName || 'Despesa Identificada',
        purchaseDate: finalDate || new Date().toISOString().split('T')[0],
        items: Array.isArray(parsedData.items) ? parsedData.items : [],
        total: typeof parsedData.total === 'number' ? parsedData.total : 0,
        category: finalCategory,
        subcategory: finalSubcategory,
        isRecurring: false,
        paymentMethod: parsedData.paymentMethod || 'Outro',
        type: 'expense'
    };

  } catch (error: any) {
    console.error('Gemini Error:', error);
    const errorMessage = error.message || '';
    
    if (errorMessage.includes('API key') || errorMessage.includes('403') || errorMessage.includes('PERMISSION_DENIED')) {
        throw new Error('API_NOT_ENABLED');
    }

    throw new Error(`Erro ao ler nota: ${errorMessage}`);
  }
};

export const extractTransactionsFromPdfText = async (pdfText: string): Promise<BankTransaction[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: `Extraia transações deste extrato bancário para JSON (date YYYY-MM-DD, description, amount number, type DEBIT/CREDIT). Texto: ${pdfText}` }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: bankTransactionResponseSchema,
      },
    });
    
    if (!response.text) return [];

    const cleanedText = cleanJsonString(response.text);
    const parsedData = JSON.parse(cleanedText);
    return Array.isArray(parsedData) ? parsedData : [];

  } catch (error: any) {
    console.error('Gemini PDF Error:', error);
    if (error.message?.includes('API key') || error.status === 403) throw new Error('API_NOT_ENABLED');
    throw new Error('Erro ao processar PDF.');
  }
};
