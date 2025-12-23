declare module '@google/genai' {
  export class GoogleGenAI {
    constructor(options: { apiKey: string });
    live: {
      connect: (options: any) => Promise<any>;
    };
  }
  export enum Modality {
    AUDIO = 'AUDIO',
    VIDEO = 'VIDEO',
    TEXT = 'TEXT'
  }
  export interface LiveServerMessage {
    toolCall?: {
      functionCalls: any[];
    };
    serverContent?: {
      modelTurn?: {
        parts?: {
          inlineData?: {
            data: string;
          };
        }[];
      };
      interrupted?: boolean;
    };
  }
  export interface FunctionDeclaration {
    name: string;
    description?: string;
    parameters?: any;
  }
  export enum Type {
    OBJECT = 'OBJECT',
    STRING = 'STRING',
    NUMBER = 'NUMBER',
    BOOLEAN = 'BOOLEAN',
    ARRAY = 'ARRAY'
  }
}
