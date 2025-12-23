import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export class MCPManager {
  constructor() {
    this.connections = new Map(); // connectionId -> { client, transport }
  }

  async connect(connectionId, serverConfig) {
    if (this.connections.has(connectionId)) {
      throw new Error(`Connection ${connectionId} already exists`);
    }

    const transport = new StdioClientTransport({
      command: serverConfig.command,
      args: serverConfig.args,
      env: serverConfig.env,
    });

    const client = new Client(
      {
        name: "mozart-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          prompts: {},
          resources: {},
          tools: {},
        },
      }
    );

    await client.connect(transport);

    this.connections.set(connectionId, { client, transport });
    return { success: true };
  }

  async disconnect(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return { success: false, error: "Connection not found" };
    }

    try {
      await connection.client.close();
    } catch (e) {
      console.error(`Error closing client ${connectionId}:`, e);
    }
    
    this.connections.delete(connectionId);
    return { success: true };
  }

  async listTools(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const result = await connection.client.listTools();
    return result.tools;
  }

  async callTool(connectionId, toolName, args) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const result = await connection.client.callTool({
      name: toolName,
      arguments: args,
    });

    return result;
  }

  async getAllTools() {
    const allTools = [];
    for (const [connectionId, connection] of this.connections) {
      try {
        const result = await connection.client.listTools();
        if (result.tools) {
          // Add connectionId to tool name or metadata to disambiguate if needed?
          // For now, just push them.
          allTools.push(...result.tools);
        }
      } catch (e) {
        console.error(`Failed to list tools for connection ${connectionId}:`, e);
      }
    }
    return allTools;
  }

  getConnections() {
    return Array.from(this.connections.keys()).map(id => ({
      id,
      status: 'connected'
    }));
  }
}
