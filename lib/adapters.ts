export interface APIAdapter {
  type: string;
  isConnected: boolean;
  subscribe: (topic: string, callback: SubscriptionCallback) => () => void;
  invoke: <T>(method: string, ...args: any[]) => Promise<T>;
  send: (channel: string, data: any) => void;
  disconnect: () => void;
}
export type SubscriptionCallback = (data: any) => void;
export const getAdapter = (url?: string) => ({} as APIAdapter);
export const adapters = {};
