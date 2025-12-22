# Mozart AI SDK Architecture Analysis

**Current vs. Recommended Implementation**

---

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       FRONTEND (React 19)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ChatInterface.tsx                                               │
│  ├─ useChat() hook from @ai-sdk/react                           │
│  ├─ DefaultChatTransport                                        │
│  │  └─ POST /api/chat                                           │
│  │     ├─ model: selectedModel                                  │
│  │     ├─ level: ❌ NOT SENT (bug)                              │
│  │     └─ temperature: ❌ NOT SENT                              │
│  │                                                              │
│  ├─ Manual message parsing                                      │
│  │  └─ RegExp for <Thinking>...</Thinking> (wrong approach)   │
│  │                                                              │
│  ├─ State Management                                            │
│  │  ├─ messages: UIMessage[]                                   │
│  │  ├─ extendedMessages: ExtendedMessage[]                    │
│  │  ├─ status: 'submitted' | 'streaming'                      │
│  │  ├─ isLoading: boolean                                      │
│  │  ├─ showThinkingBlocks: Record<msgId, boolean>             │
│  │  └─ ❌ NO: response timeout tracking                        │
│  │  └─ ❌ NO: token usage tracking                             │
│  │  └─ ❌ NO: plan progress tracking                           │
│  │                                                              │
│  └─ Components                                                  │
│     ├─ ThinkingBlock (collapsible)                             │
│     ├─ CodeBlock (syntax highlighting)                         │
│     ├─ MessageFooter (copy button)                             │
│     ├─ ModelSelector (dropdown)                                │
│     ├─ ThinkingLevelSelector (UI exists, no effect)            │
│     └─ MCPStatus (placeholder)                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                         HTTP POST
                    (text/event-stream)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js HTTP)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  server/index.js - /api/chat endpoint                           │
│  ├─ Parse request body                                          │
│  │  ├─ messages: UIMessage[]                                   │
│  │  ├─ model: string (selected model)                          │
│  │  ├─ level: ThinkingLevel (receives but underutilized)      │
│  │  └─ ❌ temperature, topP: NOT parsed                        │
│  │                                                              │
│  ├─ Model Selection                                             │
│  │  ├─ claudeCode('opus' | 'sonnet' | 'haiku')                │
│  │  │  └─ Spawns Claude CLI subprocess                         │
│  │  └─ ❌ No claude-agent-sdk integration                       │
│  │                                                              │
│  ├─ Message Conversion                                          │
│  │  └─ convertToModelMessages(UIMessage[])                     │
│  │     └─ Transforms frontend format to AI SDK format          │
│  │                                                              │
│  ├─ streamText() API Call                                      │
│  │  ├─ model: claudeCode(modelId)                              │
│  │  ├─ system: prompt string                                   │
│  │  ├─ messages: ModelMessage[]                                │
│  │  ├─ maxTokens: 4096 | 8192 | 16384 (based on level)        │
│  │  ├─ ❌ experimental_thinking: NOT CONFIGURED                │
│  │  ├─ ❌ temperature: NOT PASSED                              │
│  │  ├─ ❌ topP: NOT PASSED                                     │
│  │  ├─ ❌ tools: NOT IMPLEMENTED                               │
│  │  └─ ❌ toolChoice: NOT IMPLEMENTED                          │
│  │                                                              │
│  └─ Response Handling                                           │
│     ├─ result.pipeUIMessageStreamToResponse(res)               │
│     └─ ✅ Streams response correctly as text/event-stream      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Anthropic Claude API
                   (claude-3.5-sonnet, etc.)
                              ↓
                    Returns streaming text
           (but no native thinking blocks streamed)
```

---

## Problems with Current Architecture

### 1. Broken Feedback Loop: Thinking Level

```
User selects "Megathink"
        ↓
UI state: thinkingLevel = 'megathink'
        ↓
❌ NOT sent in request body to backend
        ↓
Backend doesn't know user wants megathink
        ↓
Server uses default maxTokens
        ↓
Result: Thinking level selector has NO EFFECT
```

### 2. Wrong Thinking Parse Strategy

```
Current approach:
Backend response: "Here's my response: <Thinking>I should...</Thinking>"
        ↓
Frontend regex: /<Thinking>...<\/Thinking>/
        ↓
❌ Assumes Claude wraps thinking in XML tags
❌ Waiting for response to complete before showing thinking
❌ No real-time thinking stream

Correct approach:
Backend enables: experimental_thinking: { type: 'enabled' }
        ↓
Claude sends: thinking_delta events in stream
        ↓
Frontend parses real-time thinking chunks
        ↓
✅ Thinking appears as it's generated
✅ User sees progress in real-time
```

### 3. Missing Progressive States

```
Current:
"Waiting..." (binary - loading or not)

Optimal:
"Thinking... (2,048/8,192 tokens)"
  → Shows budget usage in real-time
  → User knows when thinking is complete
  → Prevents timeout anxiety

Current:
No plan tracking even though Message.plan exists

Optimal:
Plan Progress:
  ✓ Analyze requirements
  ✓ Design solution
  ⏳ Implement changes
  ○ Run tests
  ○ Create PR
```

---

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React 19)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ChatInterface.tsx (IMPROVED)                                    │
│  ├─ useChat() hook                                              │
│  │  └─ DefaultChatTransport with enhanced body:                │
│  │     ├─ model: selectedModel                 ✅ Exists       │
│  │     ├─ level: thinkingLevel                 ✅ ADD THIS     │
│  │     ├─ temperature: temperature              ✅ ADD THIS     │
│  │     └─ topP: topP                            ✅ ADD THIS     │
│  │                                                              │
│  ├─ Enhanced State Management                                   │
│  │  ├─ messages: UIMessage[]                   ✅ Exists       │
│  │  ├─ status: ChatStatus                      ✅ Exists       │
│  │  ├─ responseStartTime: number               ✅ ADD THIS     │
│  │  ├─ hasResponseTimeout: boolean             ✅ ADD THIS     │
│  │  ├─ temperature: number                     ✅ ADD THIS     │
│  │  └─ topP: number                            ✅ ADD THIS     │
│  │                                                              │
│  ├─ Improved Components                                        │
│  │  ├─ ThinkingBlock v2                                        │
│  │  │  ├─ Shows token usage (used/budget)     ✅ ADD THIS     │
│  │  │  ├─ Progress bar for budget            ✅ ADD THIS     │
│  │  │  └─ Color changes when >80% used        ✅ ADD THIS     │
│  │  │                                                          │
│  │  ├─ PlanProgress (NEW)                                      │
│  │  │  ├─ Step tracker with completion status                │
│  │  │  ├─ Real-time progress as steps complete               │
│  │  │  └─ Visual indicator of current step                   │
│  │  │                                                          │
│  │  ├─ ResponseTimeout (NEW)                                  │
│  │  │  ├─ Shows elapsed time while waiting                   │
│  │  │  ├─ Triggers error after 2 minutes                     │
│  │  │  └─ Auto-display "Try again" button                    │
│  │  │                                                          │
│  │  ├─ AdvancedSettings (NEW)                                 │
│  │  │  ├─ Temperature slider (0.0 - 2.0)                     │
│  │  │  ├─ Top-P slider (0.0 - 1.0)                           │
│  │  │  └─ Real-time preview of values                        │
│  │  │                                                          │
│  │  ├─ ThinkingLevelSelector v2 (FIXED)                      │
│  │  │  └─ Now actually affects backend behavior ✅            │
│  │  │                                                          │
│  │  ├─ TokenDisplay (NEW)                                     │
│  │  │  ├─ Shows thinking token usage in real-time            │
│  │  │  ├─ Shows response token count                         │
│  │  │  └─ Estimate of total cost (with model rates)          │
│  │  │                                                          │
│  │  ├─ ThinkingBlock (REMOVE XML PARSING)                     │
│  │  │  ├─ No more RegExp for <Thinking>...</Thinking>        │
│  │  │  └─ Use AI Elements instead                            │
│  │  │                                                          │
│  │  ├─ CodeBlock (EXISTS)                     ✅             │
│  │  ├─ MessageFooter (EXISTS)                 ✅             │
│  │  └─ ModelSelector (EXISTS)                 ✅             │
│  │                                                              │
│  └─ Lifecycle Improvements                                     │
│     ├─ onResponseStart() → record startTime                   │
│     ├─ onThinkingStart() → track thinking progress            │
│     ├─ onThinkingChunk() → update token count                 │
│     ├─ onToolCall() → show tool invocation (future)           │
│     ├─ onFinish() → calculate total duration                  │
│     └─ onError() → show timeout handling                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                     HTTP POST (ENHANCED)
            body: { model, level, temp, topP }
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (Node.js HTTP)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  server/index.js - /api/chat (IMPROVED)                         │
│  ├─ Request Parsing (ENHANCED)                                  │
│  │  ├─ messages: UIMessage[]              ✅ Exists            │
│  │  ├─ model: string                      ✅ Exists            │
│  │  ├─ level: ThinkingLevel               ✅ NOW USED          │
│  │  ├─ temperature: number                ✅ ADD THIS          │
│  │  └─ topP: number                       ✅ ADD THIS          │
│  │                                                              │
│  ├─ Token Budget Calculation (IMPROVED)                         │
│  │  ├─ None → 4,096 tokens               ✅ Exists            │
│  │  ├─ Think → 8,192 tokens              ✅ Exists            │
│  │  └─ Megathink → 16,384 tokens         ✅ Exists            │
│  │  └─ PLUS experimental_thinking config  ✅ ADD THIS          │
│  │                                                              │
│  ├─ Model Provider (DECISION POINT)                            │
│  │  Option A: Keep claudeCode             ✅ Current          │
│  │    ├─ Pro: Works with local CLI auth                       │
│  │    ├─ Con: Limited feature support                         │
│  │    └─ Con: No tool calling                                 │
│  │                                                              │
│  │  Option B: Migrate to claude-agent-sdk ✅ Recommended       │
│  │    ├─ Pro: Full feature parity                            │
│  │    ├─ Pro: Tool calling support                           │
│  │    ├─ Pro: Vision/Images support                          │
│  │    ├─ Con: Requires API key or OAuth tokens               │
│  │    └─ Note: You have OAuth already!                        │
│  │                                                              │
│  ├─ streamText() Configuration (ENHANCED)                       │
│  │  ├─ model: claudeCode or claude-agent  ✅ ADD CONFIG        │
│  │  ├─ system: instructions               ✅ Exists            │
│  │  ├─ messages: ModelMessage[]           ✅ Exists            │
│  │  ├─ temperature: body.temperature      ✅ ADD THIS          │
│  │  ├─ topP: body.topP                    ✅ ADD THIS          │
│  │  ├─ experimental_thinking: {           ✅ ADD THIS          │
│  │  │    type: 'enabled',                                     │
│  │  │    budgetTokens: budgetTokens                           │
│  │  │  }                                                       │
│  │  ├─ tools: [...definitions]            ⏳ FUTURE            │
│  │  │  (For multi-turn agent loops)                          │
│  │  └─ toolChoice: 'auto'                 ⏳ FUTURE            │
│  │                                                              │
│  └─ Response Pipeline (ENHANCED)                               │
│     ├─ result.pipeUIMessageStreamToResponse(res)               │
│     │  └─ Streams response body                               │
│     │                                                          │
│     ├─ Add metadata to stream (NEW)                            │
│     │  ├─ thinking_tokens_used: number                        │
│     │  ├─ response_tokens: number                             │
│     │  ├─ total_tokens: number                                │
│     │  ├─ plan: { steps: [...], status: [...] }              │
│     │  └─ duration_ms: number                                 │
│     │                                                          │
│     └─ Handle thinking stream events (NEW)                     │
│        ├─ thinking_start                                       │
│        ├─ thinking_delta (chunks as they arrive)              │
│        └─ thinking_stop                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                   Anthropic Claude API v1
                  (claude-3.5-sonnet or later)
                              ↓
                  Returns streaming response with:
            - Text chunks (text_delta events)
            - Thinking chunks (thinking_delta events) ✅
            - Tool calls (tool_use events) - future
            - Token usage metadata
```

---

## Feature Parity Matrix

| Feature | Current | With P0 | With P1 | With P2 | With P3 |
|---------|---------|---------|---------|---------|---------|
| Basic chat | ✅ | ✅ | ✅ | ✅ | ✅ |
| Model selection | ✅ | ✅ | ✅ | ✅ | ✅ |
| Thinking blocks | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| Thinking level effect | ❌ | ✅ | ✅ | ✅ | ✅ |
| Response timeout | ❌ | ❌ | ✅ | ✅ | ✅ |
| Token tracking | ❌ | ❌ | ✅ | ✅ | ✅ |
| Plan tracking | ❌ | ❌ | ✅ | ✅ | ✅ |
| Temperature/TopP | ❌ | ❌ | ❌ | ✅ | ✅ |
| Tool calling | ❌ | ❌ | ❌ | ❌ | ✅ |
| Multi-turn agents | ❌ | ❌ | ❌ | ❌ | ✅ |
| Vision/Images | ❌ | ❌ | ❌ | ❌ | ✅† |

†Requires migration to claude-agent-sdk

---

## Data Flow Examples

### Current: Broken Thinking Level Flow

```
User: "Solve this hard problem"
  ↓
[React] setThinkingLevel('megathink')
  ↓
UI updates: "Megathink" label shows
  ↓
User clicks Send
  ↓
[useChat] sendMessage()
  ↓
Request body: {
  model: 'sonnet',
  messages: [...]
  // ❌ level NOT SENT
}
  ↓
Backend receives: no level information
  ↓
Uses default: maxTokens = 4096 (not 16384!)
  ↓
Response has less thinking because token budget is wrong
  ↓
User: "Why didn't it use Megathink?"
```

### Fixed: Thinking Level Flow (P0)

```
User: "Solve this hard problem"
  ↓
[React] setThinkingLevel('megathink')
  ↓
UI updates: "Megathink" label shows
  ↓
User clicks Send
  ↓
[useChat] sendMessage()
  ↓
Request body: {
  model: 'sonnet',
  level: 'Megathink',  ✅ NOW SENT
  messages: [...]
}
  ↓
Backend receives: level = 'Megathink'
  ↓
Sets: budgetTokens = 16384, experimental_thinking enabled
  ↓
streamText() gets: budgetTokens: 16384
  ↓
Claude enables native thinking stream
  ↓
Response has deep analysis using full token budget
  ↓
Frontend shows: "Thinking Process (16,384 tokens used)"
  ↓
User: "Perfect! Way more thorough thinking."
```

### Current: Timeout Blindness

```
User sends message
  ↓
[Frontend] isLoading = true
  ↓
[BrailleSpinner] displays: "⠋"
  ↓
Backend crashes or network drops
  ↓
No data arrives
  ↓
User waits... and waits... and waits
  ↓
After 10 minutes, user kills page out of frustration
  ↓
No error message shown
```

### Fixed: Timeout Handling (P1)

```
User sends message
  ↓
[Frontend] isLoading = true, responseStartTime = Date.now()
  ↓
[ResponseTimer] displays: "3s elapsed"
  ↓
Backend crashes or network drops
  ↓
No data arrives
  ↓
[Timeout Effect] waits 120 seconds
  ↓
[Error Display] shows: "Response timeout. Connection may be lost."
  ↓
[Retry Button] available immediately
  ↓
User clicks Retry
  ↓
Works or gets clearer error message
```

---

## Migration Path

### Phase 1: Fix Critical Issues (Week 1-2)
```
Priority.HIGH:
  - Fix thinking level not sent to backend
  - Fix thinking level not configuring budget
  - Add response timeout handling
  - Remove XML thinking parsing

Impact: Core functionality actually works as designed
Complexity: Low
Risk: Very Low
```

### Phase 2: High-Value Features (Week 3-4)
```
Priority.MEDIUM:
  - Add plan progress tracking
  - Add token usage display
  - Add temperature/topP parameters

Impact: Professional UX, user understands what's happening
Complexity: Medium
Risk: Low
```

### Phase 3: Polish (Week 5+)
```
Priority.LOW:
  - Advanced settings UI
  - Connection health monitoring
  - Response time tracking

Impact: Professional product feel
Complexity: Low
Risk: Very Low
```

### Phase 4: Future Features (Q2 2026)
```
Priority.VERY_LOW:
  - Tool calling infrastructure
  - Multi-turn agent loops
  - Claude Agent SDK migration

Impact: Enables agent workflows
Complexity: Very High
Risk: Medium (requires significant refactoring)
```

---

## Conclusion

Mozart's current architecture is **solid but incomplete**. The AI SDK integration works at the HTTP level, but:

1. **Feedback loops are broken** (thinking level has no effect)
2. **Wrong parsing strategy** (manual XML instead of native)
3. **Missing user feedback** (no timeout, no progress)
4. **Limited visibility** (no token tracking, plan status)

The recommended improvements are **low-risk, high-value changes** that:
- Fix existing bugs (thinking level)
- Add missing features (timeouts, progress)
- Improve UX significantly (token tracking, plans)
- Set foundation for future features (tools, agents)

All changes follow Vercel AI SDK best practices and patterns.
