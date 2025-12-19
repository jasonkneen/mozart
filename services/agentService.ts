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

const DEFAULT_PROVIDER: AgentProvider = 'claude';
const DEFAULT_MODEL = 'gemini-3-pro-preview';

export const agentService = {
  async generateResponse(request: AgentRequest): Promise<AgentResponse> {
    const provider = request.provider || DEFAULT_PROVIDER;
    const model = request.model || DEFAULT_MODEL;
    const history = request.history || [];

    const response = await gemini.generateResponse(request.prompt, request.level, history);
    return { text: response.text, provider, model };
  }
};
