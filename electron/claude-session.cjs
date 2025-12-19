const { query } = require('@anthropic-ai/claude-agent-sdk')
const { createRequire } = require('module')
const { existsSync } = require('fs')

const FAST_MODEL_ID = 'claude-haiku-4-5-20251001'
const SMART_MODEL_ID = 'claude-sonnet-4-5-20250929'

let querySession = null
let isProcessing = false
let shouldAbortSession = false

let messageQueue = []
let messageResolver = null
let isAborted = false

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

async function* messageGenerator() {
  while (!isAborted) {
    if (messageQueue.length > 0) {
      const { message, resolve } = messageQueue.shift()
      resolve()
      yield message
    } else {
      await new Promise(resolve => {
        messageResolver = resolve
      })
    }
  }
}

function pushMessage(message) {
  return new Promise(resolve => {
    messageQueue.push({ message, resolve })
    if (messageResolver) {
      messageResolver()
      messageResolver = null
    }
  })
}

function resetMessageQueue() {
  messageQueue = []
  messageResolver = null
  isAborted = false
}

function abortGenerator() {
  isAborted = true
  if (messageResolver) {
    messageResolver()
    messageResolver = null
  }
}

function isSessionActive() {
  return isProcessing || querySession !== null
}

async function interruptCurrentResponse() {
  if (!querySession) return false

  try {
    await querySession.interrupt()
    return true
  } catch (error) {
    console.error('Failed to interrupt response:', error)
    return false
  }
}

async function resetSession() {
  shouldAbortSession = true
  abortGenerator()
  messageQueue = []

  while (querySession !== null) {
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  querySession = null
  isProcessing = false
}

async function startStreamingSession(options) {
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

  if (isProcessing || querySession) {
    console.log('[Claude-Session] Session already active, cleaning up...')
    shouldAbortSession = true
    abortGenerator()

    let waitCount = 0
    while ((isProcessing || querySession) && waitCount < 40) {
      await new Promise(resolve => setTimeout(resolve, 50))
      waitCount++
    }

    if (isProcessing || querySession) {
      console.log('[Claude-Session] Force cleaning stale session state')
      isProcessing = false
      querySession = null
    }

    resetMessageQueue()
  }

  shouldAbortSession = false
  resetMessageQueue()
  isProcessing = true

  const modelId = model === 'fast' ? FAST_MODEL_ID : SMART_MODEL_ID

  try {
    querySession = query({
      prompt: messageGenerator(),
      options: {
        model: modelId,
        maxThinkingTokens: 32_000,
        settingSources: ['project'],
        permissionMode: 'acceptEdits',
        allowedTools: ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebFetch', 'WebSearch'],
        pathToClaudeCodeExecutable: resolveClaudeCodeCli(),
        cwd,
        includePartialMessages: true,
      }
    })

    await pushMessage({
      role: 'user',
      content: [{ type: 'text', text: prompt }]
    })

    for await (const sdkMessage of querySession) {
      if (shouldAbortSession) break

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
    isProcessing = false
    querySession = null
  }
}

async function sendMessage(text) {
  if (!querySession) {
    throw new Error('No active session')
  }

  await pushMessage({
    role: 'user',
    content: [{ type: 'text', text }]
  })
}

module.exports = {
  startStreamingSession,
  sendMessage,
  isSessionActive,
  interruptCurrentResponse,
  resetSession,
}
