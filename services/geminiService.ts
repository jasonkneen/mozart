
import { GoogleGenAI } from "@google/genai";
import { ThinkingLevel } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

export class GeminiService {
  /**
   * Generates a response from Gemini.
   * Note: Following SDK guidelines, GoogleGenAI is initialized with a named parameter
   * and we access .text property directly from the response.
   */
  async generateResponse(
    prompt: string, 
    level: ThinkingLevel = ThinkingLevel.None,
    history: { role: 'user' | 'assistant', content: string }[] = []
  ) {
    // Initializing the SDK with process.env.API_KEY as a named parameter
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let thinkingBudget = 0;
    if (level === ThinkingLevel.Think) thinkingBudget = 8192;
    if (level === ThinkingLevel.Megathink) thinkingBudget = 32768;

    const contents = [
      ...history.map(h => ({ 
        role: (h.role === 'user' ? 'user' : 'model') as 'user' | 'model', 
        parts: [{ text: h.content }] 
      })),
      { role: 'user' as const, parts: [{ text: prompt }] }
    ];

    try {
      // Calling generateContent directly on ai.models
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          // thinkingConfig is available for gemini-3 series models
          thinkingConfig: thinkingBudget > 0 ? { thinkingBudget } : undefined,
        },
      });

      return {
        // Accessing .text property directly (not a method)
        text: response.text || '',
      };
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }
}

export const gemini = new GeminiService();
