# Mozart AI SDK Integration Review

**Date**: December 22, 2025
**Status**: Comprehensive Analysis Complete
**Overall Assessment**: GOOD FOUNDATION with CRITICAL GAPS in Extended Features

---

## Executive Summary

Mozart is using the Vercel AI SDK correctly for **basic chat functionality** but is **NOT leveraging advanced features** like native thinking blocks, streaming progress updates, and structured output capabilities. The integration is **partially complete** – it works but leaves significant UX opportunities on the table.

### Quick Metrics
- **✅ Correct**: streamText usage, useChat hook, basic streaming
- **⚠️ Missing**: Extended AI Elements, thinking stream mode, tool use UI
- **❌ Breaking**: No progress tracking, no native thinking indicators, disconnected thinking level UI

---

## 1. AI SDK PATTERN ASSESSMENT

### Backend: streamText Usage (server/index.js)

```javascript
// CORRECT PATTERN - Lines 641-652
const result = streamText({
  model: claudeCode(modelId),
  maxTokens,
  system: `...`,
  messages: modelMessages,
});

result.pipeUIMessageStreamToResponse(res);
```

**Status**: ✅ **CORRECT**
- Using proper `streamText` API
- Correct `pipeUIMessageStreamToResponse` method
- Model selection working correctly
- Token budget mapping to thinking levels

**Issue**: Missing extended request properties:
```javascript
// NOT IMPLEMENTED
{
  system: '...',
  messages: modelMessages,
  // Missing these:
  // temperature?: number
  // topP?: number
  // frequencyPenalty?: number
  // presencePenalty?: number
  // topK?: number
  // stopSequences?: string[]
  // tools?: Tool[]  // For tool use
}
```

---

### Frontend: useChat Hook (ChatInterface.tsx)

```typescript
// CORRECT PATTERN - Lines 117-151
const { messages, sendMessage, status, setMessages } = useChat({
  id: tabId,
  transport: new DefaultChatTransport({
    api: `${API_BASE}/chat`,
    body: {
      model: selectedModel,
    },
  }),
  onFinish: ({ message }: { message: UIMessage }) => {
    // Handle completion
  },
  onError: (error) => {
    // Handle error
  },
})
```

**Status**: ✅ **CORRECT**
- Using proper `useChat` hook
- DefaultChatTransport configured correctly
- Event handlers implemented (onFinish, onError)
- Status tracking working

**Issue**: Not passing `thinking level` through request body:
```typescript
// CURRENT - does NOT pass thinking level
body: {
  model: selectedModel,
  // Missing:
  // level: thinkingLevel,  // ← Not sent to backend!
}
```

---

## 2. EXTENDED AI ELEMENTS (Not Used)

Mozart is NOT using AI SDK's **AI Elements** for thinking/progress feedback. These are missing:

### What's Missing

**1. TextStreamDisplay** - For displaying streaming text with thinking blocks
```typescript
import { TextStreamDisplay } from '@ai-sdk/react/ui'

// COULD USE THIS for native thinking rendering
<TextStreamDisplay
  stream={/* stream from streamText */}
  showThinking={true}
/>
```

**2. MessageCircle / Thinking Indicators** - Native thinking progress
```typescript
import { MessageCircle, Thinking } from '@ai-sdk/react/ui'

// Shows real-time thinking updates, not just collapsed blocks
```

**3. ToolInvoking UI** - For multi-turn tool calling
```typescript
import { ToolInvoking } from '@ai-sdk/react/ui'

// Renders tool calls as they execute
```

---

## 3. THINKING STREAM MODE - NOT IMPLEMENTED

### Current Implementation (Incorrect)

ChatInterface manually parses `<Thinking>...</Thinking>` blocks from response:
```typescript
// Lines 165-174 - MANUAL PARSING
const thinkingRegex = /<Thinking>([\s\S]*?)<\/Thinking>/g
let thinkingMatch: RegExpExecArray | null
while ((thinkingMatch = thinkingRegex.exec(remaining)) !== null) {
  // Manual parsing and extraction
}
```

**Problem**: This assumes thinking is wrapped in XML tags in the response, but:
1. Claude API doesn't return thinking in XML tags when using standard `streamText`
2. Thinking blocks need special `budgetTokens` parameter to enable
3. Backend isn't requesting streaming thinking

### Correct Implementation Needed

Backend should enable thinking streaming:
```javascript
// server/index.js - WHAT IT SHOULD DO
const result = streamText({
  model: claudeCode(modelId),
  system: '...',
  messages: modelMessages,
  // MISSING: Enable thinking
  experimental_thinking: {
    type: 'enabled',
    budgetTokens: maxTokens,  // Use token budget for thinking
  }
});
```

Then frontend should capture it:
```typescript
// ChatInterface.tsx - WHAT IT SHOULD DO
import { experimental_createThinkingStream } from '@ai-sdk/react'

// Works with Claude's native thinking blocks, not XML
const { thinkingStream, textStream } = experimental_createThinkingStream(stream)
```

---

## 4. CLAUDE CODE PROVIDER vs CLAUDE AGENT SDK

### Current Approach: ai-sdk-provider-claude-code

**What you're using** (line 11, server/index.js):
```javascript
import { claudeCode } from 'ai-sdk-provider-claude-code';
```

**Why it exists**: Wraps Claude CLI to spawn subprocess with local auth

**Status**: ✅ Works but has tradeoffs:
- Pro: No API key needed, uses local Claude CLI
- Con: No Tool Use support, no Vision/Images
- Con: No streaming thinking blocks
- Con: One-to-one model to CLI process

### Alternative: claude-agent-sdk

**What you have installed** (package.json line 20):
```json
"@anthropic-ai/claude-agent-sdk": "^0.1.63"
```

**Why you should consider it**:
- Full feature support (tools, vision, thinking)
- Better streaming integration
- Built for agent workflows

**Trade-off**: Requires API key or OAuth tokens

**Current Architecture**: You're already using OAuth! Line 593 in server/index.js shows:
```javascript
if (parsed.pathname === '/api/oauth/token' && method === 'GET') {
  // Token available here
}
```

**Recommendation**: You CAN switch to claude-agent-sdk since you have OAuth tokens available. The current claudeCode provider is fine for MVP but limits extensibility.

---

## 5. STREAMING CONNECTION HANDLING

### Current Status

**Frontend** (ChatInterface.tsx):
- ✅ Proper status tracking: `status === 'submitted' || 'streaming'`
- ✅ Loading state: `isLoading` state machine
- ✅ Auto-scroll on new messages
- ✅ Error handling in onError callback

**Backend** (server/index.js):
- ✅ Using `pipeUIMessageStreamToResponse` for proper streaming
- ✅ Error handling with sendError fallback
- ⚠️ No keep-alive/timeout handling visible

### What's Missing

No connection health monitoring:
```typescript
// NOT IMPLEMENTED in ChatInterface
const MAX_RESPONSE_TIME = 60000; // 60 seconds
const [responseTimeout, setResponseTimeout] = useState<NodeJS.Timeout | null>(null)

useEffect(() => {
  if (isLoading) {
    const timeout = setTimeout(() => {
      // Connection lost handling
      setError('Response timeout - connection may have been lost')
      setIsSubmitting(false)
    }, MAX_RESPONSE_TIME)
    setResponseTimeout(timeout)
  }
  return () => {
    if (responseTimeout) clearTimeout(responseTimeout)
  }
}, [isLoading])
```

---

## 6. TOOL CALLING & MULTI-TURN AGENT LOOPS

### Current Status: ❌ NOT IMPLEMENTED

Mozart has zero tool calling infrastructure:

**Missing from Backend**:
```javascript
// No tools defined in streamText
// No tool result handling
// No multi-turn loop
```

**Missing from Frontend**:
```typescript
// No tool invocation UI
// No tool result inputs
// No agent loop visualization
```

### Would Need To Add

1. **Tool definitions**:
```javascript
// server/index.js - in streamText call
tools: [
  {
    name: 'read_file',
    description: 'Read file content',
    inputSchema: { /* zod schema */ },
  },
  // ... more tools
]
```

2. **Tool result handling**:
```javascript
const result = streamText({
  // ...
  tools: [ /* ... */ ],
  onToolCall: async (toolCall) => {
    // Execute tool, return result
  }
})
```

3. **Multi-turn loop**:
```typescript
// Frontend would need to:
// - Show tool invocation UI
// - Send tool results back to model
// - Loop until no more tool calls
```

**Verdict**: This is a **future feature**, not a current requirement. Good that it's not attempted.

---

## 7. THINKING/PROGRESS INDICATORS - GAPS

### Current Implementation

✅ **Thinking toggle block** (lines 524-549):
- Collapsible `<Thinking>` block with icon
- Shows thinking character count
- Renders with syntax highlighting

❌ **Progress indicators missing**:
- No streaming thinking updates (thinking filled in real-time)
- No step-by-step progress (plan → execute → verify)
- No token usage tracking
- No cost estimation

### What Should Be Added

**Real-time thinking progress**:
```typescript
// NOT IMPLEMENTED
interface ThinkingStream {
  type: 'thinking_start'
  index: number
  thinking: string
  budgetTokens: number
  usedTokens: number
}

// Could show:
// "Thinking... (2,048 / 8,192 tokens used)"
```

**Plan tracking**:
```typescript
// The Message type has a 'plan' field (types.ts line 25-30)
// But ChatInterface doesn't display it from streaming responses
// Current code only shows plans from response.plans, which needs to come from backend

if (msg.plan) {
  <PlanProgressBar
    steps={msg.plan.steps}
    currentStep={/* track which step is active */}
  />
}
```

---

## 8. SUMMARY OF FINDINGS

### Green (Working Correctly)

| Feature | Status | Notes |
|---------|--------|-------|
| streamText API | ✅ | Proper implementation, correct streaming |
| useChat hook | ✅ | Full usage, lifecycle handling |
| OAuth flow | ✅ | Working end-to-end |
| Error handling | ✅ | Both frontend and backend |
| Message state sync | ✅ | UI updates with streaming |
| Markdown rendering | ✅ | Syntax highlighting, code blocks |
| Model selection | ✅ | Switching between models works |

### Yellow (Incomplete/Partial)

| Feature | Status | Notes |
|---------|--------|-------|
| Thinking blocks | ⚠️ | Manual XML parsing instead of native |
| Streaming progress | ⚠️ | No real-time token/step tracking |
| Thinking level UI | ⚠️ | UI exists but not sent to backend |
| AI Elements | ⚠️ | Not used, would improve UX |
| Request parameters | ⚠️ | Missing temperature, topP, etc. |

### Red (Not Implemented)

| Feature | Status | Notes |
|---------|--------|-------|
| Streaming thinking blocks | ❌ | Parsing XML instead of native streaming |
| Tool calling | ❌ | Zero infrastructure |
| Multi-turn agents | ❌ | No tool result handling |
| Plan tracking | ❌ | Type exists but not populated from stream |
| Response timeout handling | ❌ | No connection health monitoring |
| Budget token tracking | ❌ | No thinking token usage display |

---

## 9. RECOMMENDATIONS (PRIORITY ORDER)

### P0: Critical (Breaking Bugs)

**1. Pass thinking level to backend**
```typescript
// ChatInterface.tsx line 121-123
body: {
  model: selectedModel,
  level: thinkingLevel, // ← ADD THIS
}
```

**2. Stop manual XML parsing, use native thinking**
- Remove `thinkingRegex` parsing
- Add `experimental_thinking` to backend streamText
- Use proper thinking stream APIs

### P1: High Value (Significant UX Improvements)

**3. Add response timeout handling**
```typescript
const MAX_RESPONSE_TIME = 60000
// Show "Connection lost" if no data in 60s
```

**4. Implement plan progress tracking**
```typescript
// Extract plan from streaming response metadata
// Show steps in real-time as they complete
```

**5. Add token usage tracking**
```typescript
// Show budget tokens used for thinking
// "Thinking used 2,048/8,192 tokens"
```

### P2: Medium Value (Polish)

**6. Use AI Elements for thinking display**
- Replace custom ThinkingBlock with TextStreamDisplay
- Renders thinking as it streams, not waiting for completion

**7. Add advanced request parameters**
```javascript
// server/index.js - streamText call
{
  temperature: body.temperature || 1.0,
  topP: body.topP || 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
  // etc.
}
```

**8. Connection health monitoring**
- Implement keep-alive pings
- Auto-retry on connection loss

### P3: Future (Nice to Have)

**9. Tool calling infrastructure**
- Define MCP tools for file/git operations
- Implement multi-turn agent loops
- Show tool invocation in UI

**10. Claude Agent SDK migration**
- Evaluate switching from claudeCode to @anthropic-ai/claude-agent-sdk
- Gain Vision/Images support
- Better agent loop semantics

---

## 10. CODE LOCATIONS FOR CHANGES

| Change | File | Lines | Type |
|--------|------|-------|------|
| Pass thinking level | ChatInterface.tsx | 121-123 | Config |
| Stop XML parsing | ChatInterface.tsx | 165-174 | Delete |
| Enable thinking stream | server/index.js | 641-652 | Add config |
| Timeout handling | ChatInterface.tsx | ~220 | New useEffect |
| Plan tracking | ChatInterface.tsx | ~360 | New component |
| Token tracking | ChatInterface.tsx | ThinkingBlock | Update display |

---

## 11. IMPLEMENTATION ROADMAP

### Week 1: Fix Critical Issues
- [ ] Pass thinking level to backend
- [ ] Add response timeout handling
- [ ] Enable native thinking streaming

### Week 2: Improve UX
- [ ] Implement plan progress tracking
- [ ] Add token usage display
- [ ] Replace custom thinking UI with AI Elements

### Week 3: Polish
- [ ] Add connection health monitoring
- [ ] Implement advanced parameters
- [ ] Test edge cases

### Week 4+: Future Features
- [ ] Tool calling infrastructure
- [ ] Multi-turn agent loops
- [ ] Consider SDK provider migration

---

## 12. CONCLUSION

Mozart has **correctly implemented the core AI SDK patterns** and can chat effectively. However, it's **leaving significant UX features on the table**:

1. **Thinking blocks are manually parsed** instead of using native streaming
2. **Thinking level selection has no effect** (not sent to backend)
3. **Plan tracking UI exists but never populated** from responses
4. **No real-time progress indicators** for long-running responses
5. **Missing connection health monitoring** for reliability

**The good news**: These are all **additive features** that don't require rearchitecting. The current implementation is solid; it just needs enhancement.

**Recommended approach**:
1. Fix P0 issues (thinking level, native thinking)
2. Add P1 improvements (timeouts, plan tracking, token display)
3. Migrate to P2 polish (AI Elements, parameters)
4. Keep P3 future work for later

This will transform Mozart from "working chat" to "feature-rich orchestration UI."
