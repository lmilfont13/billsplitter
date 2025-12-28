
import { GoogleGenAI, Type } from "@google/genai";
import { BillItem } from "../types";

const apiKey = process.env.API_KEY;

// Mock data to use if API key is missing or call fails
const MOCK_RESULT = {
  items: [
    { id: '1', name: 'Pizza Calabresa', price: 45.90, quantity: 1, assignments: {} },
    { id: '2', name: 'Refrigerante 2L', price: 12.50, quantity: 1, assignments: {} },
    { id: '3', name: 'Suco de Laranja', price: 17.80, quantity: 2, assignments: {} },
    { id: '4', name: 'Sobremesa Pudim', price: 15.00, quantity: 1, assignments: {} },
    { id: '5', name: 'Taxa de Serviço (10%)', price: 8.23, quantity: 1, assignments: {} },
  ],
  establishment: "Restaurante Exemplo",
  date: new Date().toLocaleDateString('pt-BR')
};

export interface ParseResult {
  items: BillItem[];
  establishment: string;
  date: string;
}

export const parseReceiptWithGemini = async (base64Image: string): Promise<ParseResult> => {
  if (!apiKey) {
    console.warn("No Gemini API Key found. Using mock data.");
    await new Promise(resolve => setTimeout(resolve, 1500));
    return MOCK_RESULT;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: "Analise este recibo fiscal. Extraia: 1. O nome fantasia do estabelecimento. 2. A data da compra (formato DD/MM/AAAA). 3. Uma lista de itens consumidos com nome, preço TOTAL do item e quantidade. Ignore subtotais e linhas de pagamento."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            establishment: { type: Type.STRING, description: "Nome do restaurante, loja ou estabelecimento no topo do cupom" },
            date: { type: Type.STRING, description: "Data da emissão do cupom fiscal" },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  quantity: { type: Type.NUMBER }
                },
                required: ["name", "price"]
              }
            }
          },
          required: ["establishment", "items", "date"]
        }
      }
    });

    const text = response.text;
    if (!text) {
        throw new Error("No response text from Gemini");
    }

    const parsed = JSON.parse(text);
    
    const items = parsed.items.map((item: any, index: number) => {
        // Fix: Force quantity to be at least 1 and integer to avoid assignment logic errors
        let qty = Number(item.quantity) || 1;
        if (qty < 1 || !Number.isInteger(qty)) {
            qty = Math.max(1, Math.round(qty));
        }

        return {
            id: `gemini-${index}-${Date.now()}`,
            name: item.name,
            price: Number(item.price),
            quantity: qty,
            assignments: {}
        };
    });

    return {
        items,
        establishment: parsed.establishment || "Novo Estabelecimento",
        date: parsed.date || new Date().toLocaleDateString('pt-BR')
    };

  } catch (error) {
    console.error("Error parsing receipt with Gemini:", error);
    return MOCK_RESULT;
  }
};
