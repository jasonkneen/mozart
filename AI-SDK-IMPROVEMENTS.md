# Mozart AI SDK: Implementation Guide

**Practical code examples for implementing the recommendations.**

---

## P0: Critical Fixes

### Fix 1: Pass Thinking Level to Backend

**File: `components/ChatInterface.tsx` (lines 117-124)**

```typescript
// BEFORE
const { messages, sendMessage, status, setMessages } = useChat({
  id: tabId,
  transport: new DefaultChatTransport({
    api: `${API_BASE}/chat`,
    body: {
      model: selectedModel,
      // ❌ Thinking level is NOT sent
    },
  }),
  onFinish: ({ message }: { message: UIMessage }) => {

// AFTER
const { messages, sendMessage, status, setMessages } = useChat({
  id: tabId,
  transport: new DefaultChatTransport({
    api: `${API_BASE}/chat`,
    body: {
      model: selectedModel,
      level: thinkingLevel.charAt(0).toUpperCase() + thinkingLevel.slice(1), // 'think' → 'Think'
      // ✅ Now sent to backend
    },
  }),
  onFinish: ({ message }: { message: UIMessage }) => {
```

**File: `server/index.js` (lines 619-660)**

```javascript
// BEFORE
if (parsed.pathname === '/api/chat' && method === 'POST') {
  try {
    const body = await readJsonBody(req);
    // ...
    let maxTokens = 4096;
    if (body.level === 'Think') maxTokens = 8192;
    if (body.level === 'Megathink') maxTokens = 16384;

    const modelMessages = convertToModelMessages(body.messages);

    const result = streamText({
      model: claudeCode(modelId),
      maxTokens,
      system: `...`,
      messages: modelMessages,
      // ❌ Token budget not mapped to thinking

// AFTER
if (parsed.pathname === '/api/chat' && method === 'POST') {
  try {
    const body = await readJsonBody(req);
    // ...
    let budgetTokens = 4096; // Renamed for clarity
    let thinkingMode = 'disabled';

    if (body.level === 'Think') {
      budgetTokens = 8192;
      thinkingMode = 'enabled';
    }
    if (body.level === 'Megathink') {
      budgetTokens = 16384;
      thinkingMode = 'enabled';
    }

    const modelMessages = convertToModelMessages(body.messages);

    const result = streamText({
      model: claudeCode(modelId),
      system: `...`,
      messages: modelMessages,
      // ✅ Configure thinking if available (depends on model)
      ...(thinkingMode === 'enabled' && {
        experimental_thinking: {
          type: 'enabled',
          budgetTokens: budgetTokens,
        }
      }),
```

---

### Fix 2: Enable Native Thinking Streaming

**File: `server/index.js` (lines 641-655)**

The current code manually maps `maxTokens`, but needs to properly configure thinking for models that support it.

```javascript
// BEFORE
const result = streamText({
  model: claudeCode(modelId),
  maxTokens,
  system: `...`,
  messages: modelMessages,
});

// AFTER
// Note: claudeCode provider may not support experimental_thinking
// This depends on which Claude model is being used
const result = streamText({
  model: claudeCode(modelId),
  system: `...`,
  messages: modelMessages,
  // Try to enable thinking if supported by the model
  // If using claude-3.5-sonnet or later, this works
  ...(thinkingMode === 'enabled' && {
    experimental_thinking: {
      type: 'enabled',
      budgetTokens: budgetTokens,
    },
  }),
});
```

**Important Note**: The `claudeCode` provider spawns a subprocess. You may need to verify it supports `experimental_thinking`. If not, consider migrating to `@anthropic-ai/claude-agent-sdk` for full feature support.

---

## P1: High Value Improvements

### Improvement 1: Response Timeout Handling

**File: `components/ChatInterface.tsx` (add after line 115)**

```typescript
// Add state for timeout tracking
const [responseStartTime, setResponseStartTime] = useState<number | null>(null)
const [hasResponseTimeout, setHasResponseTimeout] = useState(false)
const MAX_RESPONSE_TIME = 120000 // 2 minutes

// Add effect to track response timeout
useEffect(() => {
  let timeoutId: NodeJS.Timeout | null = null

  if (isLoading) {
    setResponseStartTime(Date.now())
    setHasResponseTimeout(false)

    timeoutId = setTimeout(() => {
      setHasResponseTimeout(true)
      setError('Response timeout - no data received for 2 minutes. Connection may have been lost.')
      setIsSubmitting(false)
    }, MAX_RESPONSE_TIME)
  } else {
    if (timeoutId) clearTimeout(timeoutId)
    setResponseStartTime(null)
  }

  return () => {
    if (timeoutId) clearTimeout(timeoutId)
  }
}, [isLoading])

// Add to render (after line 405, in loading state)
{isLoading && msg.isStreaming && (
  <div className="flex items-center gap-2">
    <BrailleSpinner />
    {responseStartTime && (
      <span className="text-xs text-white/40">
        {Math.round((Date.now() - responseStartTime) / 1000)}s
      </span>
    )}
  </div>
)}

// Show timeout error
{hasResponseTimeout && (
  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
    <div className="text-sm text-red-400">
      Response timeout - connection may have been lost. Try sending your message again.
    </div>
  </div>
)}
```

---

### Improvement 2: Plan Progress Tracking

**File: `components/ChatInterface.tsx` (add new component after line 771)**

```typescript
// New component for plan progress
interface PlanProgressProps {
  plan: Message['plan']
  isActive: boolean
}

const PlanProgress: React.FC<PlanProgressProps> = ({ plan, isActive }) => {
  if (!plan) return null

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden mb-4">
      <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <ClipboardList size={14} className="text-blue-400" />
          <span className="text-sm font-medium text-white">{plan.title}</span>
          {isActive && <BrailleSpinner />}
        </div>
        <p className="text-xs text-white/50 mt-1">{plan.description}</p>
      </div>

      <div className="px-4 py-3 space-y-2">
        {plan.steps.map((step, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className={clsx(
              'flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mt-0.5 shrink-0',
              step.completed
                ? 'bg-green-500/20 text-green-400'
                : 'bg-white/10 text-white/40'
            )}>
              {step.completed ? '✓' : idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white">{step.label}</div>
              <div className="text-xs text-white/50 mt-0.5">{step.details}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Then in render (around line 360):**

```typescript
{msg.role === 'assistant' && msg.plan && (
  <PlanProgress plan={msg.plan} isActive={msg.isStreaming} />
)}

<div className="space-y-3">
  {/* existing code for text parts */}
</div>
```

**File: `server/index.js` (lines 619-660)**

When the backend detects a plan in the response, populate it:

```javascript
// After streaming completes, if response contains plan markers:
const result = streamText({
  model: claudeCode(modelId),
  system: `You are Conductor, an elite local-first AI coding orchestrator.

When planning work, structure your response as:
## Plan: [Title]
[Description]

- **Step 1**: [Label]
  [Details]
- **Step 2**: [Label]
  [Details]

Mark completed steps with ✓.
`,
  messages: modelMessages,
});
```

**Then parse plan from response** (backend can extract and send as metadata):

```javascript
// This would need to be added to the response stream
// Parse "## Plan:" sections and structure them
// Then include as metadata in the stream
```

---

### Improvement 3: Token Usage Tracking

**File: `components/ChatInterface.tsx` (update ThinkingBlock component, line 524)**

```typescript
// BEFORE
const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ content, isOpen, onToggle }) => (
  <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-xs font-medium text-white/60 group"
    >
      <ChevronRight size={14} className={clsx('transition-transform', isOpen && 'rotate-90')} />
      <Brain size={14} className="text-purple-400/60" />
      <span>Thinking Process</span>
      <div className="ml-auto text-white/40 text-xs">
        {content.length} chars
      </div>
    </button>

// AFTER
interface ThinkingBlockProps {
  content: string
  isOpen: boolean
  onToggle: () => void
  tokenUsage?: { used?: number; budget?: number } // NEW
}

const ThinkingBlock: React.FC<ThinkingBlockProps> = ({
  content,
  isOpen,
  onToggle,
  tokenUsage
}) => {
  // Rough estimate: ~1 token per 4 characters (Claude tokenization)
  const estimatedTokens = Math.ceil(content.length / 4)
  const budgetTokens = tokenUsage?.budget || 8192
  const usedTokens = tokenUsage?.used || estimatedTokens
  const percentUsed = Math.round((usedTokens / budgetTokens) * 100)

  return (
  <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-xs font-medium text-white/60 group"
    >
      <ChevronRight size={14} className={clsx('transition-transform', isOpen && 'rotate-90')} />
      <Brain size={14} className="text-purple-400/60" />
      <span>Thinking Process</span>
      <div className="ml-auto flex items-center gap-2">
        {/* Token usage bar */}
        <div className="flex items-center gap-1">
          <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full transition-all',
                percentUsed > 80 ? 'bg-red-500' : 'bg-blue-500'
              )}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-white/40 font-mono">
            {usedTokens}/{budgetTokens}
          </span>
        </div>
      </div>
    </button>

    {isOpen && (
      <div className="px-4 py-3 border-t border-white/10 bg-white/[0.02] max-h-[500px] overflow-y-auto">
        <div className="prose prose-invert prose-sm max-w-none text-[13px] leading-relaxed text-white/50 font-normal">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    )}
  </div>
)
}
```

---

## P2: Polish & Best Practices

### Polish 1: Advanced Request Parameters

**File: `components/ChatInterface.tsx` (add state after line 115)**

```typescript
// Add to ChatInterface state
const [temperature, setTemperature] = useState(1.0)
const [topP, setTopP] = useState(1.0)

// Add to useChat body
body: {
  model: selectedModel,
  level: thinkingLevel.charAt(0).toUpperCase() + thinkingLevel.slice(1),
  temperature, // NEW
  topP,        // NEW
}
```

**File: `server/index.js` (lines 641-655)**

```javascript
// Extract from request body
const temperature = body.temperature ?? 1.0
const topP = body.topP ?? 1.0

const result = streamText({
  model: claudeCode(modelId),
  system: `...`,
  messages: modelMessages,
  temperature,
  topP,
  // Other optional parameters
  frequencyPenalty: 0,
  presencePenalty: 0,
})
```

---

### Polish 2: Add Model Parameter UI

**File: `components/ChatInterface.tsx` (add component after line 728)**

```typescript
interface AdvancedSettingsProps {
  temperature: number
  onTemperatureChange: (temp: number) => void
  topP: number
  onTopPChange: (p: number) => void
}

const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  temperature,
  onTemperatureChange,
  topP,
  onTopPChange,
}) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-white/40 hover:text-white/60 hover:bg-white/5 rounded-lg transition-colors"
        title="Advanced settings"
      >
        <Settings size={16} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 bg-[#1a1a1f] border border-white/10 rounded-lg shadow-xl p-4 z-50 w-56">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-white/60">Temperature</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
                className="w-full mt-1"
              />
              <div className="text-[10px] text-white/40 mt-1">{temperature.toFixed(1)}</div>
            </div>

            <div>
              <label className="text-xs font-medium text-white/60">Top P</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={topP}
                onChange={(e) => onTopPChange(parseFloat(e.target.value))}
                className="w-full mt-1"
              />
              <div className="text-[10px] text-white/40 mt-1">{topP.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## P3: Future Features (Not Recommended Yet)

### Tool Calling Infrastructure (Sketch)

This is complex and would require significant changes. Here's the architecture:

```javascript
// server/index.js - Tool definitions
const tools = [
  {
    name: 'read_file',
    description: 'Read the contents of a file',
    inputSchema: z.object({
      path: z.string().describe('Absolute file path'),
    }),
  },
  {
    name: 'write_file',
    description: 'Write content to a file',
    inputSchema: z.object({
      path: z.string(),
      content: z.string(),
    }),
  },
  // ... more tools
]

const result = streamText({
  model: claudeCode(modelId),
  system: '...',
  messages: modelMessages,
  tools,
  // Set to 'auto' to let the model decide when to use tools
  toolChoice: 'auto',
  // Handle tool calls
  onToolCall: async (toolCall) => {
    if (toolCall.toolName === 'read_file') {
      const path = toolCall.args.path
      const content = await readFile(path, 'utf8')
      return { success: true, content }
    }
    // ... handle other tools
  }
})
```

**Complexity**: Requires:
- Tool execution system
- Result passing back to model
- Multi-turn message loop
- UI for tool invocation visualization
- Error recovery for failed tools

**Recommendation**: Implement in Q2 2026 or when Claude Agent SDK is fully integrated.

---

## Implementation Checklist

### Week 1: Critical Fixes
- [ ] Update ChatInterface to pass `level` in body
- [ ] Update server to use thinking budget tokens
- [ ] Test thinking level changes work end-to-end
- [ ] Add response timeout handling

### Week 2: High Value Improvements
- [ ] Implement PlanProgress component
- [ ] Add token tracking to ThinkingBlock
- [ ] Test plan parsing from responses
- [ ] Add response time display

### Week 3: Polish
- [ ] Add temperature/topP to UI
- [ ] Implement AdvancedSettings component
- [ ] Test all parameter changes
- [ ] Add connection health indicators

### Week 4+: Future
- [ ] Evaluate claude-agent-sdk migration
- [ ] Design tool calling architecture
- [ ] Plan multi-turn agent loops

---

## Testing Checklist

After implementing each improvement:

```typescript
// Test 1: Thinking level is sent and respected
// - Change thinking level to "Megathink"
// - Send message
// - Verify backend receives level === 'Megathink'
// - Verify maxTokens is 16384

// Test 2: Timeout handling works
// - Kill backend server (simulate timeout)
// - Send message
// - Wait 2+ minutes
// - Verify timeout error appears

// Test 3: Plan parsing works
// - Send request that includes plan
// - Verify PlanProgress renders with correct steps
// - Check step completion status updates

// Test 4: Token tracking displays correctly
// - Look at thinking block
// - Verify token usage bar shows
// - Verify percentage calculation is correct

// Test 5: Temperature changes affect response
// - Set temperature to 0.1 (deterministic)
// - Send same prompt twice
// - Verify similar responses
// - Set temperature to 2.0 (creative)
// - Verify more varied responses
```

---

## Conclusion

These improvements follow the **Vercel AI SDK best practices** and will transform Mozart from a functional chat to a sophisticated orchestration interface. Implement in priority order for maximum impact with minimal disruption.
