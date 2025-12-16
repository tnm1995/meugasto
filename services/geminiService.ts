import { GoogleGenAI, Type } from "@google/genai";
import type { Expense, BankTransaction, Omit } from "../types";
import { CATEGORIES } from "../types";

/**
 * =====================================================
 * Gemini API Key (Vite padrão)
 * =====================================================
 */
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * Se não houver chave, NÃO inicializa a IA.
 * O app continua funcionando normalmente.
 */
if (!apiKey) {
  console.warn(
    "[Gemini] VITE_GEMINI_API_KEY não configurada. Recursos de IA desativados."
  );
}

/**
 * Inicializa apenas se houver chave
 */
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const categoryList = Object.keys(CATEGORIES).join(", ");

/**
 * =====================================================
 * SCHEMAS
 * =====================================================
 */
const expenseResponseSchema = {
  type: Type.OBJECT,
  properties: {
    localName: { type: Type.STRING },
    purchaseDate: { type: Type.STRING },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          price: { type: Type.NUMBER },
        },
        required: ["name", "price"],
      },
    },
    total: { type: Type.NUMBER },
    category: {
      type: Type.STRING,
      description: `Opções: ${categoryList}`,
    },
    subcategory: { type: Type.STRING },
    paymentMethod: { type: Type.STRING },
  },
  required: ["localName", "purchaseDate", "items", "total", "category"],
};

const bankTransactionResponseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      date: { type: Type.STRING },
      description: { type: Type.STRING },
      amount: { type: Type.NUMBER },
      type: { type: Type.STRING, enum: ["DEBIT", "CREDIT"] },
    },
    required: ["date", "description", "amount", "type"],
  },
};

/**
 * =====================================================
 * EXPENSE IMAGE
 * =====================================================
 */
export const extractExpenseFromImage = async (
  base64Image: string
): Promise<Omit<Expense, "id">> => {
  if (!ai) {
    throw new Error("API_NOT_ENABLED");
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: base64Image } },
        {
          text:
            "Analise esta imagem de cupom fiscal/recibo e extraia os dados estruturados.",
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: expenseResponseSchema,
    },
  });

  if (!response.text) {
    throw new Error("EMPTY_RESPONSE");
  }

  const data = JSON.parse(response.text);

  return {
    localName: data.localName || "Desconhecido",
    purchaseDate:
      data.purchaseDate || new Date().toISOString().split("T")[0],
    items: data.items || [],
    total: typeof data.total === "number" ? data.total : 0,
    category: data.category || "Outros",
    subcategory: data.subcategory || "Outros",
    paymentMethod: data.paymentMethod || "Outro",
    isRecurring: false,
    type: "expense",
  };
};

/**
 * =====================================================
 * BANK PDF
 * =====================================================
 */
export const extractTransactionsFromPdfText = async (
  pdfText: string
): Promise<BankTransaction[]> => {
  if (!ai) {
    throw new Error("API_NOT_ENABLED");
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        {
          text: `Extraia as transações financeiras deste extrato bancário em JSON:\n${pdfText}`,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: bankTransactionResponseSchema,
    },
  });

  if (!response.text) {
    return [];
  }

  const parsed = JSON.parse(response.text);
  return Array.isArray(parsed) ? parsed : [];
};
