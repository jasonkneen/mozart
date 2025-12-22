# Mozart AI SDK - Quick Implementation Checklist

**Copy this file and check off items as you complete them.**

---

## P0: Critical Fixes (Do This Week)

### Fix 1: Pass Thinking Level to Backend

- [ ] **Edit**: `components/ChatInterface.tsx` line 121
  - [ ] Add `level: thinkingLevel.charAt(0).toUpperCase() + thinkingLevel.slice(1),` to request body
  - [ ] Test: Select "Megathink" and verify in Chrome DevTools Network tab

- [ ] **Edit**: `server/index.js` line 628
  - [ ] Change `let maxTokens` to `let budgetTokens`
  - [ ] Add thinking level detection
  - [ ] Test: Check server logs show correct budget tokens

- [ ] **Test**: End-to-end
  - [ ] Send message with "None" thinking level → should be fast
  - [ ] Send message with "Megathink" → should be thorough
  - [ ] Verify different quality of thinking

**Time**: 30 minutes
**Priority**: CRITICAL

---

### Fix 2: Enable Native Thinking on Backend

- [ ] **Edit**: `server/index.js` line 641-652 (streamText call)
  - [ ] Add `experimental_thinking` config block
  - [ ] Use `budgetTokens` value from thinking level
  - [ ] Handle case where provider doesn't support thinking

- [ ] **Verify**: Check server logs
  - [ ] Look for thinking_start events in stream
  - [ ] Check thinking_delta chunks are sent
  - [ ] Verify thinking_stop appears

- [ ] **Test**: Frontend display
  - [ ] Send message, watch for thinking progress
  - [ ] Check ThinkingBlock loads with content
  - [ ] Verify manual XML parsing still works (for now)

**Time**: 30 minutes
**Priority**: CRITICAL
**Note**: May need to verify claudeCode provider supports experimental_thinking

---

### Fix 3: Add Response Timeout

- [ ] **Edit**: `components/ChatInterface.tsx` after line 115
  - [ ] Add `responseStartTime` state
  - [ ] Add `hasResponseTimeout` state
  - [ ] Add `useEffect` for timeout handler
  - [ ] Set 120-second timeout

- [ ] **Edit**: `components/ChatInterface.tsx` render section
  - [ ] Add timeout error display (red banner)
  - [ ] Add retry button
  - [ ] Show elapsed time while waiting

- [ ] **Test**: Simulate timeout
  - [ ] Stop backend server
  - [ ] Send message from frontend
  - [ ] Wait 2 minutes
  - [ ] Verify error appears
  - [ ] Verify "Try again" button shown
  - [ ] Restart server
  - [ ] Click "Try again" → should work

**Time**: 1 hour
**Priority**: CRITICAL
**Safety**: Prevents user confusion on connection issues

---

## P1: High-Value Features (Next Week)

### Feature 1: Plan Progress Display

- [ ] **Create**: New component `PlanProgress`
  - [ ] Show title and description
  - [ ] Show steps as numbered list
  - [ ] Mark completed steps with checkmark
  - [ ] Show active step indicator (if streaming)

- [ ] **Edit**: `components/ChatInterface.tsx`
  - [ ] Import `PlanProgress` component
  - [ ] Add plan rendering in message display (around line 360)
  - [ ] Check `msg.plan` before rendering
  - [ ] Pass `isStreaming` to show live updates

- [ ] **Edit**: `server/index.js`
  - [ ] Update system prompt to mention plan formatting
  - [ ] Parse plan from response (optional for now)
  - [ ] Or rely on frontend to extract from text

- [ ] **Test**: Manual plan request
  - [ ] Send request that includes plan-like structure
  - [ ] Verify component renders
  - [ ] Check layout matches design
  - [ ] Verify step counter updates

**Time**: 2 hours
**Priority**: MEDIUM
**Visual**: Makes progress transparent to user

---

### Feature 2: Token Usage Display

- [ ] **Edit**: `ThinkingBlock` component (lines 524-549)
  - [ ] Add `tokenUsage` prop
  - [ ] Calculate token percentage
  - [ ] Add progress bar to header
  - [ ] Show "used/budget" numbers
  - [ ] Change color to red when >80% used

- [ ] **Edit**: `components/ChatInterface.tsx`
  - [ ] Add `tokenUsage` tracking to message state
  - [ ] Extract token counts from response metadata
  - [ ] Pass to `ThinkingBlock` component

- [ ] **Edit**: `server/index.js`
  - [ ] Track thinking tokens used during response
  - [ ] Add to response metadata or stream events
  - [ ] Calculate total tokens at end

- [ ] **Test**: Token display
  - [ ] Send long thinking request
  - [ ] Watch token progress bar fill
  - [ ] Verify numbers are accurate
  - [ ] Check color change at 80%

**Time**: 1 hour
**Priority**: MEDIUM
**Transparency**: Users understand thinking resource usage

---

### Feature 3: Response Time Tracking

- [ ] **Edit**: `components/ChatInterface.tsx`
  - [ ] Use existing `responseStartTime` (from P0 Fix 3)
  - [ ] Display elapsed time in real-time
  - [ ] Show final duration in message footer

- [ ] **Edit**: `MessageFooter` component (lines 31-53)
  - [ ] Display response duration in seconds
  - [ ] Format nicely (e.g., "45s")
  - [ ] Show next to message size info

- [ ] **Test**: Timing display
  - [ ] Send message
  - [ ] Watch timer increment
  - [ ] Verify final duration shows
  - [ ] Check appears in message footer

**Time**: 30 minutes
**Priority**: MEDIUM
**UX**: Users know response speed

---

## P2: Polish (Following Week)

### Polish 1: Temperature and TopP UI

- [ ] **Edit**: `components/ChatInterface.tsx` state (after line 115)
  - [ ] Add `temperature` state (default: 1.0)
  - [ ] Add `topP` state (default: 1.0)
  - [ ] Add setters for both

- [ ] **Create**: `AdvancedSettings` component
  - [ ] Temperature slider (0.0 - 2.0)
  - [ ] TopP slider (0.0 - 1.0)
  - [ ] Show current values
  - [ ] Collapsible button in input area

- [ ] **Edit**: `components/ChatInterface.tsx` request body
  - [ ] Add `temperature: temperature`
  - [ ] Add `topP: topP`

- [ ] **Edit**: `server/index.js`
  - [ ] Extract temperature from body
  - [ ] Extract topP from body
  - [ ] Pass to streamText config

- [ ] **Test**: Parameters work
  - [ ] Set temperature to 0.1, send same prompt twice
  - [ ] Responses should be nearly identical
  - [ ] Set temperature to 1.8, send same prompt twice
  - [ ] Responses should be very different

**Time**: 2 hours
**Priority**: LOW
**Feature Completeness**: Advanced users can customize

---

### Polish 2: Connection Health Monitor

- [ ] **Edit**: `components/ChatInterface.tsx`
  - [ ] Add periodic health check during streaming
  - [ ] Detect "stalled" stream (no data for >30s)
  - [ ] Show connection quality indicator

- [ ] **Add**: Visual indicator
  - [ ] Green dot = good connection
  - [ ] Yellow dot = slow connection
  - [ ] Red dot = poor connection

- [ ] **Test**: Connection indicators
  - [ ] Normal internet → green
  - [ ] Throttle network (DevTools) → yellow/red
  - [ ] Indicator updates appropriately

**Time**: 1 hour
**Priority**: LOW
**Reliability**: Users know connection status

---

## P3: Future Features (Q2 2026)

### Feature: Tool Calling Infrastructure

**Status**: ❌ Not started
**Effort**: 20+ hours
**Complexity**: HIGH

- [ ] Design tool schema
- [ ] Implement tool definitions
- [ ] Add tool result handling
- [ ] Create multi-turn message loop
- [ ] Build tool invocation UI
- [ ] Test tool execution

**Notes**: This is a major feature. Schedule separately.

---

### Feature: Multi-Turn Agent Loops

**Status**: ❌ Not started
**Effort**: 15+ hours
**Complexity**: HIGH

- [ ] Implement agent message loop
- [ ] Handle tool results as new messages
- [ ] Track agent steps
- [ ] Show agent progress

**Dependencies**: Requires tool calling first

---

### Feature: Claude Agent SDK Migration

**Status**: ⏳ Not started
**Effort**: 5 hours
**Complexity**: MEDIUM

- [ ] Evaluate claude-agent-sdk
- [ ] Compare with claudeCode provider
- [ ] Plan migration strategy
- [ ] Implement provider swap
- [ ] Test all features
- [ ] Update documentation

**Benefits**: Full feature support, tool calling, vision

---

## Testing Checklist

### After P0 Fixes

```
Functionality Tests:
[ ] Thinking level selector sends to backend
[ ] Backend receives thinking level correctly
[ ] Thinking budget tokens are configured
[ ] Response timeout error appears after 2 min
[ ] Timeout error has retry button
[ ] Connection errors display gracefully

Regression Tests:
[ ] Regular chat still works
[ ] Model selection still works
[ ] File attachments still work (if implemented)
[ ] Markdown rendering unchanged
[ ] Code blocks still copy correctly
```

### After P1 Features

```
Plan Progress:
[ ] Plan renders when present in response
[ ] Steps display with labels and details
[ ] Completed steps show checkmark
[ ] Active step shows indicator
[ ] Layout doesn't break on many steps

Token Tracking:
[ ] Token progress bar appears
[ ] Numbers update in real-time
[ ] Color changes at 80% threshold
[ ] Shows used/budget correctly
[ ] Works with different thinking levels

Response Timing:
[ ] Timer starts when message sends
[ ] Timer increments visibly
[ ] Final duration shows in footer
[ ] Duration formatting is readable
```

### After P2 Polish

```
Advanced Settings:
[ ] Temperature slider works (0.0-2.0)
[ ] TopP slider works (0.0-1.0)
[ ] Values update responses appropriately
[ ] Settings persist in session
[ ] UI doesn't take up excess space

Connection Health:
[ ] Health indicator visible
[ ] Shows green on normal connection
[ ] Shows yellow/red on slow connection
[ ] Updates during streaming
[ ] Doesn't interfere with UX
```

---

## Development Workflow

### Before Starting
```bash
# Ensure you're on main branch
git status
git checkout main
git pull

# Install dependencies
npm install

# Start servers
npm run dev        # Terminal 1: Frontend
npm run dev:server # Terminal 2: Backend
```

### For Each Fix
```bash
# Create feature branch
git checkout -b fix/P0-thinking-level

# Make changes
# Test thoroughly

# Commit with clear message
git add .
git commit -m "P0: Fix thinking level not sent to backend"

# Push branch
git push origin fix/P0-thinking-level

# Create PR or merge to main
```

### Testing Each Fix
```bash
# 1. Manual testing in browser
- Open http://localhost:3000
- Test functionality
- Check Chrome DevTools Network tab
- Check browser Console for errors

# 2. Check backend logs
- Watch terminal running npm run dev:server
- Look for request/response logs
- Verify thinking config appears

# 3. Verify no regressions
- Test basic chat still works
- Test other features unaffected
- Check UI doesn't break
```

---

## Common Issues & Solutions

### Issue: Browser shows thinking blocks but they're empty
**Cause**: XML parsing finds blocks but content is empty
**Solution**: Ensure backend is sending thinking content in response

### Issue: Timeout works but shows up for normal slow responses
**Cause**: 2-minute timeout is too short for Megathink
**Solution**: Increase to 5 minutes, or make configurable

### Issue: Token numbers don't match actual usage
**Cause**: Frontend estimation doesn't match Claude's tokenizer
**Solution**: Get actual counts from backend if available

### Issue: Plan component renders but steps don't update
**Cause**: Response parsing isn't extracting plan structure
**Solution**: Parse response text or add plan to metadata

---

## Completion Tracking

### Week 1: P0 Critical Fixes
- [ ] Thinking level passes to backend
- [ ] Backend enables thinking streaming
- [ ] Response timeout implemented
- [ ] All P0 tests passing
- [ ] Code reviewed and merged

### Week 2: P1 High-Value Features
- [ ] Plan progress component complete
- [ ] Token usage tracking complete
- [ ] Response timing display complete
- [ ] All P1 tests passing
- [ ] Code reviewed and merged

### Week 3: P2 Polish
- [ ] Advanced settings UI complete
- [ ] Connection health monitor complete
- [ ] Edge cases handled
- [ ] All P2 tests passing
- [ ] Code reviewed and merged

### Week 4: Documentation & Wrap-up
- [ ] Update README with new features
- [ ] Document advanced settings
- [ ] Create user guide
- [ ] Final testing and QA

---

## Success Criteria

### P0 Fixes Complete ✅
- Thinking level actually affects response
- Errors displayed gracefully
- No broken functionality

### P1 Features Complete ✅
- Users see thinking progress
- Users see token usage
- Users know response duration

### P2 Polish Complete ✅
- Professional, polished interface
- Advanced users can customize
- No technical debt

### Ready for Production ✅
- All tests passing
- Code reviewed
- Documentation complete
- User happy with experience

---

## Reference Links

**In This Codebase**:
- Review: `/AI-SDK-REVIEW.md` (comprehensive analysis)
- Implementation: `/AI-SDK-IMPROVEMENTS.md` (code examples)
- Architecture: `/AI-SDK-ARCHITECTURE.md` (system design)
- Summary: `/AI-SDK-SUMMARY.md` (executive overview)

**External Resources**:
- [Vercel AI SDK Docs](https://sdk.vercel.ai/)
- [useChat Hook](https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat)
- [streamText](https://sdk.vercel.ai/docs/reference/ai-sdk-core/stream-text)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)

---

## Questions?

- **What should I do first?** → Start with P0 fixes (thinking level)
- **How long will this take?** → ~9 hours total, spread over 3-4 weeks
- **What if P0 breaks something?** → All changes are additive, revert easily
- **When should I do P3?** → After P0+P1 stable, schedule Q2 2026
- **Do I need to rewrite components?** → No, small targeted changes

---

**Last Updated**: December 22, 2025
**Status**: Ready to implement
**Confidence**: High (low risk, high value changes)
