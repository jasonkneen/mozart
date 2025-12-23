import { useState, useEffect, useCallback, useRef } from 'react';
import { ToolApprovalRequest } from '../components/ToolApprovalCard';

const API_BASE = (import.meta as any).env?.VITE_CONDUCTOR_API_BASE || '';
const WS_BASE = API_BASE.replace(/^http/, 'ws').replace('/api', '') || `ws://localhost:4545`;

interface UseToolApprovalOptions {
  enabled?: boolean;
  onApprovalRequest?: (request: ToolApprovalRequest) => void;
  onApprovalAcknowledged?: (approvalId: string, handled: boolean) => void;
}

interface UseToolApprovalReturn {
  pendingApprovals: ToolApprovalRequest[];
  isConnected: boolean;
  approve: (approvalId: string) => void;
  reject: (approvalId: string, reason?: string) => void;
  clearApproval: (approvalId: string) => void;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 2000;
const MAX_RECONNECT_DELAY = 30000;

export function useToolApproval(options: UseToolApprovalOptions = {}): UseToolApprovalReturn {
  const { enabled = false, onApprovalRequest, onApprovalAcknowledged } = options;

  const [pendingApprovals, setPendingApprovals] = useState<ToolApprovalRequest[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);

  // Store callbacks in refs to avoid dependency issues
  const onApprovalRequestRef = useRef(onApprovalRequest);
  const onApprovalAcknowledgedRef = useRef(onApprovalAcknowledged);

  // Update refs when callbacks change
  useEffect(() => {
    onApprovalRequestRef.current = onApprovalRequest;
    onApprovalAcknowledgedRef.current = onApprovalAcknowledged;
  }, [onApprovalRequest, onApprovalAcknowledged]);

  // Connect on mount or when enabled changes
  useEffect(() => {
    if (!enabled) {
      // Disconnect when disabled
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    // Reset reconnect state when enabled
    reconnectAttemptsRef.current = 0;
    reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;

    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      // Check max reconnect attempts
      if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        console.warn(`Tool approval WebSocket: Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Toggle tool approval to retry.`);
        return;
      }

      const wsUrl = `${WS_BASE}/api/tool-approval`;

      // Only log on first attempt
      if (reconnectAttemptsRef.current === 0) {
        console.log('Connecting to tool approval WebSocket:', wsUrl);
      }

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('Tool approval WebSocket connected');
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
          reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
        };

        ws.onclose = () => {
          setIsConnected(false);
          wsRef.current = null;

          // Reconnect with exponential backoff (only if still enabled)
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current++;
            const delay = reconnectDelayRef.current;
            reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);

            console.log(`Tool approval WebSocket disconnected. Retry ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
            reconnectTimeoutRef.current = setTimeout(connect, delay);
          }
        };

        ws.onerror = () => {
          // Suppress error logging - onclose will handle reconnection
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            if (message.type === 'tool-approval-request') {
              const request: ToolApprovalRequest = {
                approvalId: message.approvalId,
                toolName: message.toolName,
                input: message.input,
                timestamp: message.timestamp,
              };

              setPendingApprovals((prev) => {
                // Avoid duplicates
                if (prev.some((p) => p.approvalId === request.approvalId)) {
                  return prev;
                }
                return [...prev, request];
              });

              onApprovalRequestRef.current?.(request);
            }

            if (message.type === 'approval-acknowledged') {
              // Remove from pending
              setPendingApprovals((prev) =>
                prev.filter((p) => p.approvalId !== message.approvalId)
              );
              onApprovalAcknowledgedRef.current?.(message.approvalId, message.handled);
            }
          } catch (error) {
            console.error('Error parsing tool approval message:', error);
          }
        };
      } catch (error) {
        console.error('Failed to connect to tool approval WebSocket:', error);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled]);

  // Approve a tool
  const approve = useCallback((approvalId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'approval-response',
        approvalId,
        approved: true,
      }));
    }
  }, []);

  // Reject a tool
  const reject = useCallback((approvalId: string, reason?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'approval-response',
        approvalId,
        approved: false,
        reason,
      }));
    }
  }, []);

  // Clear an approval (for UI cleanup)
  const clearApproval = useCallback((approvalId: string) => {
    setPendingApprovals((prev) =>
      prev.filter((p) => p.approvalId !== approvalId)
    );
  }, []);

  return {
    pendingApprovals,
    isConnected,
    approve,
    reject,
    clearApproval,
  };
}

export default useToolApproval;
