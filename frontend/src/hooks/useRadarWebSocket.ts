import { useEffect, useState, useRef } from 'react';

export function useRadarWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to specific backend using local dev port
    ws.current = new WebSocket('ws://localhost:8000/ws/radar');

    ws.current.onopen = () => {
      console.log('Connected to Radar WS');
      setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      console.log('Radar Ping:', event.data);
      setMessages(prev => [...prev, event.data]);
    };

    ws.current.onclose = () => {
      console.log('Disconnected from Radar WS');
      setIsConnected(false);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const sendMessage = (msg: string) => {
    if (ws.current && isConnected) {
      ws.current.send(msg);
    }
  };

  return { isConnected, messages, sendMessage };
}
