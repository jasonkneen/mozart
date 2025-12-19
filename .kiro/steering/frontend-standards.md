---
inclusion: fileMatch
fileMatchPattern: '*.tsx|*.jsx|*.ts'
---

# Frontend Development Standards

## Component Structure

```tsx
import React, { useState, useRef, useEffect } from 'react';
import { SomeType } from '../types';
import { SomeIcon } from 'lucide-react';

interface ComponentProps {
  prop1: string;
  onAction: (value: string) => void;
}

const Component: React.FC<ComponentProps> = ({ prop1, onAction }) => {
  const [state, setState] = useState('');

  // Effects
  useEffect(() => {
    // setup
  }, [dependencies]);

  // Handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAction(state);
  };

  return (
    <div className="...">
      {/* JSX */}
    </div>
  );
};

export default Component;
```

## Icons
Use `lucide-react` for all icons:
```tsx
import { Send, Plus, Settings } from 'lucide-react';
<Send size={18} className="text-white/60" />
```

## Form Handling
- Use controlled inputs with `useState`
- Handle Enter key submission in textareas:
```tsx
onKeyDown={(e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit(e);
  }
}}
```

## Conditional Rendering
```tsx
// Ternary for simple cases
{isOpen && <Dropdown />}

// Ternary for if/else
{condition ? <ComponentA /> : <ComponentB />}

// Nullish for defaults
{value ?? 'default'}
```

## Refs
Use `useRef` for DOM access and scroll handling:
```tsx
const scrollRef = useRef<HTMLDivElement>(null);
scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
```

## Store Integration
```tsx
import { useConductorStore } from './services/store';

const Component = () => {
  const { state, actions } = useConductorStore();
  const { workspaces, activeWorkspaceId } = state;

  // Use actions to update state
  actions.setActiveWorkspace(id);
  actions.addMessage(workspaceId, message);
};
```

## Async Data Loading
```tsx
useEffect(() => {
  let cancelled = false;

  const loadData = async () => {
    try {
      const data = await service.getData();
      if (cancelled) return;
      setState(data);
    } catch (error) {
      console.error(error);
    }
  };

  loadData();
  return () => { cancelled = true; };
}, [dependency]);
```
