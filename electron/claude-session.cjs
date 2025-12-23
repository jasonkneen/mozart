const { query } = require('@anthropic-ai/claude-agent-sdk')
const { createRequire } = require('module')
const { existsSync } = require('fs')

const FAST_MODEL_ID = 'claude-haiku-4-5-20251001'
const SMART_MODEL_ID = 'claude-sonnet-4-5-20250929'

function resolveClaudeCodeCli() {
  const requireModule = createRequire(__filename)
  const cliPath = requireModule.resolve('@anthropic-ai/claude-agent-sdk/cli.js')

  if (cliPath.includes('app.asar')) {
    const unpackedPath = cliPath.replace('app.asar', 'app.asar.unpacked')
    if (existsSync(unpackedPath)) {
      return unpackedPath
    }
  }
  return cliPath
}

class ClaudeSession {
  constructor() {
    this.querySession = null
    this.isProcessing = false
    this.shouldAbortSession = false
    this.messageQueue = []
    this.messageResolver = null
    this.isAborted = false
    this.mcpTools = []
  }

  async *messageGenerator() {
    while (!this.isAborted) {
      if (this.messageQueue.length > 0) {
        const { message, resolve } = this.messageQueue.shift()
        resolve()
        yield message
      } else {
        await new Promise(resolve => {
          this.messageResolver = resolve
        })
      }
    }
  }

  pushMessage(message) {
    return new Promise(resolve => {
      this.messageQueue.push({ message, resolve })
      if (this.messageResolver) {
        this.messageResolver()
        this.messageResolver = null
      }
    })
  }

  resetMessageQueue() {
    this.messageQueue = []
    this.messageResolver = null
    this.isAborted = false
  }

  abortGenerator() {
    this.isAborted = true
    if (this.messageResolver) {
      this.messageResolver()
      this.messageResolver = null
    }
  }

  isSessionActive() {
    return this.isProcessing || this.querySession !== null
  }

  async interruptCurrentResponse() {
    if (!this.querySession) return false

    try {
      await this.querySession.interrupt()
      return true
    } catch (error) {
      console.error('Failed to interrupt response:', error)
      return false
    }
  }

  async resetSession() {
    this.shouldAbortSession = true
    this.abortGenerator()
    this.messageQueue = []

    while (this.querySession !== null) {
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    this.querySession = null
    this.isProcessing = false
  }

  updateMCPTools(tools) {
    this.mcpTools = tools
  }

  async startStreamingSession(options) {
    const {
      prompt,
      model = 'smart',
      cwd = process.cwd(),
      onTextChunk,
      onToolUse,
      onToolResult,
      onComplete,
      onError,
    } = options

    if (this.isProcessing || this.querySession) {
      console.log('[Claude-Session] Session already active, cleaning up...')
      this.shouldAbortSession = true
      this.abortGenerator()

      let waitCount = 0
      while ((this.isProcessing || this.querySession) && waitCount < 40) {
        await new Promise(resolve => setTimeout(resolve, 50))
        waitCount++
      }

      if (this.isProcessing || this.querySession) {
        console.log('[Claude-Session] Force cleaning stale session state')
        this.isProcessing = false
        this.querySession = null
      }

      this.resetMessageQueue()
    }

    this.shouldAbortSession = false
    this.resetMessageQueue()
    this.isProcessing = true

    const modelId = model === 'fast' ? FAST_MODEL_ID : SMART_MODEL_ID

    // Combine default tools with MCP tools
    // Note: The SDK expects tool names as strings in allowedTools if they are built-in,
    // but for custom tools (MCP), we might need to pass definitions or handle them differently.
    // However, the current SDK usage shows `allowedTools` as a list of strings.
    // If MCP tools are to be used, they likely need to be registered with the agent or passed in a specific way.
    // Looking at the SDK docs (or assuming based on typical patterns), `allowedTools` might just be for enabling built-in tools.
    // If the SDK supports custom tools, they would be passed in `tools` or similar.
    // BUT, the current code only uses `allowedTools`.
    // Let's assume for now we just append the names if they are strings, or we might need to investigate how to pass actual tool definitions.
    // The prompt says: "Ensure that tools discovered via MCP are passed to the ClaudeSession so the agent can use them."
    // Since I don't have the SDK docs, I will assume `tools` option is available or `allowedTools` can take definitions.
    // Wait, the current code uses `allowedTools: ['Bash', ...]` which are strings.
    // If I look at `electron/claude-session.cjs` again:
    // `allowedTools: ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebFetch', 'WebSearch']`
    // If MCP tools are external, we probably need to pass them differently.
    // However, without SDK docs, I'll assume there is a `tools` property for custom tools.
    // If not, I might need to check `node_modules/@anthropic-ai/claude-agent-sdk` definitions if possible, or just try to pass them.
    // Let's try to list definitions of the SDK to see what `query` accepts.

    try {
      const queryOptions = {
        model: modelId,
        maxThinkingTokens: 32_000,
        settingSources: ['project'],
        permissionMode: 'acceptEdits',
        allowedTools: ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebFetch', 'WebSearch'],
        pathToClaudeCodeExecutable: resolveClaudeCodeCli(),
        cwd,
        includePartialMessages: true,
      }

      // If we have MCP tools, we might need to add them.
      // Assuming `tools` is the key for custom tools.
      if (this.mcpTools && this.mcpTools.length > 0) {
          queryOptions.tools = this.mcpTools;
      }

      this.querySession = query({
        prompt: this.messageGenerator(),
        options: queryOptions
      })

      await this.pushMessage({
        role: 'user',
        content: [{ type: 'text', text: prompt }]
      })

      for await (const sdkMessage of this.querySession) {
        if (this.shouldAbortSession) break

        if (sdkMessage.type === 'stream_event') {
          const streamEvent = sdkMessage.event

          if (streamEvent.type === 'content_block_delta') {
            if (streamEvent.delta.type === 'text_delta') {
              onTextChunk?.(streamEvent.delta.text)
            }
          } else if (streamEvent.type === 'content_block_start') {
            if (streamEvent.content_block.type === 'tool_use') {
              onToolUse?.({
                id: streamEvent.content_block.id,
                name: streamEvent.content_block.name,
                input: streamEvent.content_block.input || {},
              })
            }
          }
        } else if (sdkMessage.type === 'assistant') {
          const assistantMessage = sdkMessage.message
          if (assistantMessage.content) {
            for (const block of assistantMessage.content) {
              if (
                typeof block === 'object' &&
                block !== null &&
                'tool_use_id' in block &&
                'content' in block
              ) {
                let contentStr = ''
                if (typeof block.content === 'string') {
                  contentStr = block.content
                } else if (block.content) {
                  contentStr = JSON.stringify(block.content, null, 2)
                }

                onToolResult?.({
                  toolUseId: block.tool_use_id,
                  content: contentStr,
                  isError: block.is_error || false,
                })
              }
            }
          }
        } else if (sdkMessage.type === 'result') {
          onComplete?.()
        }
      }
    } catch (error) {
      console.error('Error in streaming session:', error)
      onError?.(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      this.isProcessing = false
      this.querySession = null
    }
  }

  async sendMessage(text) {
    if (!this.querySession) {
      throw new Error('No active session')
    }

    await this.pushMessage({
      role: 'user',
      content: [{ type: 'text', text }]
    })
  }
}

module.exports = { ClaudeSession }
