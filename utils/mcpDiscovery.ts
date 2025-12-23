import { MCPServerConfig } from '../types/mcp';

export interface MCPDiscoveryResult {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface DiscoveredMCPServerConfig extends MCPServerConfig {
  autoConnect?: boolean;
}

export async function discoverMCPServers(projectPath?: string): Promise<DiscoveredMCPServerConfig[]> {
  return [];
}

export function mergeServerConfigs(initial: MCPServerConfig[], discovered: DiscoveredMCPServerConfig[]): MCPServerConfig[] {
  // Simple merge: add discovered if not present in initial
  const initialIds = new Set(initial.map(s => s.id));
  const newConfigs = discovered.filter(s => !initialIds.has(s.id));
  return [...initial, ...newConfigs];
}

export function isDiscoveryAvailable(): boolean {
  return false;
}
