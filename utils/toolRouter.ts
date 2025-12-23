export interface ToolCall { id: string; name: string; args: any; }
export interface ToolHandlers { [key: string]: any; }
export interface ToolResponse { id: string; name: string; response: any; }
export const executeToolCalls = async (calls: ToolCall[], handlers: ToolHandlers, options?: any): Promise<ToolResponse[]> => [];
