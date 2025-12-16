
import { GoogleGenAI, Type } from "@google/genai";
import type { Expense, BankTransaction, Omit } from '../types';
import { CATEGORIES } from '../types';

// Initialize the Gemini API client directly with the environment variable
// adhering to the requirement: const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const categoryList = Object.keys(CATEGORIES).join(', ');

const expenseResponseSchema = {
  type: Type.OBJECT,
  properties: {
    localName: { type: Type.STRING, description: "Nome do estabelecimento comercial." },
    purchaseDate: { type: Type.STRING, description: "Data da compra no formato YYYY-MM-DD." },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          price: { type: Type.NUMBER },
        },
        required: ['name', 'price'],
      },
      description: "Lista de produtos ou serviços adquiridos com seus respectivos preços unitários ou totais do item."
    },
    total: { type: Type.NUMBER, description: "Valor total final da nota fiscal." },
    category: { type: Type.STRING, description: `A melhor categoria que se aplica a esta despesa. Opções: ${categoryList}` },
    subcategory: { type: Type.STRING, description: "Uma subcategoria relevante baseada no contexto da categoria principal." },
    paymentMethod: { type: Type.STRING, description: "Método de pagamento (Crédito, Débito, Pix, Dinheiro, etc)." }
  },
  required: ['localName', 'purchaseDate', 'total', 'category', 'items'],
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
        { text: 'Analise esta imagem de cupom fiscal/recibo (NFC-e, SAT ou recibo comum). Extraia os dados estruturados. Para a data, procure a data de emissão. Liste todos os itens visíveis com seus preços. Identifique o total pago. Categorize a despesa.' }
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
    
    // Validação básica para garantir que não quebre a UI
    return {
        localName: parsedData.localName || 'Desconhecido',
        purchaseDate: parsedData.purchaseDate || new Date().toISOString().split('T')[0],
        items: parsedData.items || [],
        total: typeof parsedData.total === 'number' ? parsedData.total : 0,
        category: parsedData.category || 'Outros',
        subcategory: parsedData.subcategory || 'Outros',
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
