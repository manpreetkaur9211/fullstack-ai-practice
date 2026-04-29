
import { useState, useRef, useCallback, useEffect, useEffectEvent } from "react";
type Status =
  | "connecting"
  | "connected"
  | "dropped"
  | "reconnecting"
  | "failed";

type Options<T> = {
  data?: T;
  onMessage: (message: T) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export function useWebSocket<T>(url: string, options: Options<T>) {
  const [status, setStatus] = useState<Status>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const retryCount = useRef(0);
  const retryId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optionsRef = useRef<Options<T>>(options);
  optionsRef.current = options;


  const connect = useCallback(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;
    setStatus(retryCount.current === 0 ? "connecting" : "reconnecting");
    ws.onopen = () => {
      setStatus("connected");
      retryCount.current = 0;
      optionsRef.current.onOpen?.();
    };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as T;
      optionsRef.current.onMessage(data); // we use optionsRef to get the latest onMessage callback,
    };
    ws.onclose = () => {
      setStatus("dropped");
      optionsRef.current.onClose?.();
      if (retryCount.current >= 5) {
        setStatus("failed");
        return;
      } else {
        retryCount.current++;
        setStatus("reconnecting");
        const delay = Math.min(500 * Math.pow(2, retryCount.current), 30000);
        const jitter = Math.random() * 1000;
        retryId.current = setTimeout(connect, delay + jitter);
      }
    };
    ws.onerror = (error) => {
      ws.close // it will trigger onclose event, so we don't need to handle retry logic here
    };
  }, [url]); //  connect should be recreated to connect to updated url, so we add url as a dependency

  // connect on mount
  useEffect(() => {
    connect();
    return () => {
      if (retryId.current) {
        clearTimeout(retryId.current);
      }
      wsRef.current?.close(1000);
    };
  }, [connect]);

  const sendMessage = useCallback((message: T) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } 
  }, []);

  const reconnect = useCallback(() => {
    wsRef.current?.close();
    retryCount.current = 0; // reset retry count when manually reconnecting
    connect();
  }, [connect]);

  return { status, sendMessage, reconnect };
}
