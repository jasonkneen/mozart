export interface ClusoAgent {
  chat: (message: string, options?: any) => Promise<any>;
  reset: () => void;
}
export interface ClusoAgentCallbacks {}
export const createClusoAgent = (callbacks?: any) => ({} as ClusoAgent);
export const clusoAgent = { process: async (message: string) => {} };
