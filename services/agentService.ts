import { AgentProvider, ThinkingLevel } from '../types';
import { gemini } from './geminiService';

type AgentHistory = { role: 'user' | 'assistant'; content: string };

type AgentRequest = {
  prompt: string;
  level: ThinkingLevel;
  history?: AgentHistory[];
  provider?: AgentProvider;
  model?: string;
};

type AgentResponse = {
  text: string;
  provider: AgentProvider;
  model: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const DEFAULT_PROVIDER: AgentProvider = 'codex';
const DEFAULT_MODEL = 'gpt-5-codex';

const useGeminiProvider = () => {
  return Boolean((import.meta as { env?: Record<string, string> }).env?.VITE_USE_GEMINI);
};

export const agentService = {
  async generateResponse(request: AgentRequest): Promise<AgentResponse> {
    const provider = request.provider || DEFAULT_PROVIDER;
    const model = request.model || DEFAULT_MODEL;
    const history = request.history || [];

    if (useGeminiProvider()) {
      const response = await gemini.generateResponse(request.prompt, request.level, history);
      return { text: response.text, provider, model };
    }

    await sleep(350);

    return {
      text:
        `Mock ${provider} response (${model}). Connect a real provider to enable live results.\n\n` +
        `Prompt: ${request.prompt}`,
      provider,
      model
    };
  }
};
