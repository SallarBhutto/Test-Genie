
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface SSEEvent {
  type: string;
  defectId?: string;
  workItemId?: number;
  timestamp: string;
  message: string;
}

export function useSSE() {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    try {
      console.log('📡 Connecting to SSE...');
      eventSourceRef.current = new EventSource('/api/events');

      eventSourceRef.current.onopen = () => {
        console.log('📡 SSE connected');
        reconnectAttempts.current = 0;
      };

      eventSourceRef.current.onmessage = (event) => {
        try {
          const data: SSEEvent = JSON.parse(event.data);
          console.log('📡 SSE event received:', data);

          switch (data.type) {
            case 'connected':
              console.log('📡 SSE connection confirmed');
              break;
            
            case 'defect_updated':
              console.log(`📡 Defect updated: ${data.defectId}`);
              // Invalidate defects query to refresh the data
              queryClient.invalidateQueries({ queryKey: ["/api/defects"] });
              queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
              break;
            
            case 'ping':
              // Just keep-alive, no action needed
              break;
            
            default:
              console.log('📡 Unknown SSE event type:', data.type);
          }
        } catch (error) {
          console.error('📡 Error parsing SSE event:', error);
        }
      };

      eventSourceRef.current.onerror = (error) => {
        console.error('📡 SSE error:', error);
        eventSourceRef.current?.close();
        eventSourceRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000; // 1s, 2s, 4s, 8s, 16s
          console.log(`📡 Reconnecting SSE in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          console.error('📡 Max SSE reconnection attempts reached');
        }
      };
    } catch (error) {
      console.error('📡 Failed to create SSE connection:', error);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      console.log('📡 SSE disconnected');
    }
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN,
    reconnect: connect,
    disconnect
  };
}
