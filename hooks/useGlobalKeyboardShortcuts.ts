import { useEffect, useState, useRef } from 'react';

export interface KeyboardShortcutHandlers {
  onWorkspaceSwitch?: (index: number) => void;
  onFilePicker?: () => void;
  onCommandPalette?: () => void;
  onQuickAction?: () => void;
  onEscape?: () => void;
}

export function useGlobalKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  const [isMetaKeyHeld, setIsMetaKeyHeld] = useState(false);
  const handlersRef = useRef(handlers);

  // Keep handlers ref in sync to avoid effect re-runs
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Track modifier key state (Meta for Mac, Control for Windows/Linux)
      if (e.key === 'Meta' || e.key === 'Control') {
        setIsMetaKeyHeld(true);
      }

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // Handle Escape (no modifier needed)
      if (e.key === 'Escape') {
        if (handlersRef.current.onEscape) {
          handlersRef.current.onEscape();
        }
        return;
      }

      // All other shortcuts require Cmd/Ctrl
      if (!isCmdOrCtrl) return;

      // Workspace Switching (Cmd+1 to Cmd+9)
      if (e.code.startsWith('Digit')) {
        const digit = parseInt(e.code.replace('Digit', ''), 10);
        if (digit >= 1 && digit <= 9) {
          e.preventDefault();
          handlersRef.current.onWorkspaceSwitch?.(digit);
          return;
        }
      }

      // File Picker (Cmd+P) & Command Palette (Shift+Cmd+P)
      if (e.code === 'KeyP') {
        e.preventDefault();
        if (e.shiftKey) {
          handlersRef.current.onCommandPalette?.();
        } else {
          handlersRef.current.onFilePicker?.();
        }
        return;
      }

      // Quick Action (Cmd+K)
      if (e.code === 'KeyK') {
        e.preventDefault();
        handlersRef.current.onQuickAction?.();
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') {
        setIsMetaKeyHeld(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return { isMetaKeyHeld };
}
