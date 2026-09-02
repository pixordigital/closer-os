"use client";
import { useEffect, useRef, useState } from "react";

type CopilotEvent = { type: string; payload?: unknown; error?: string; ts?: string };

export function useCopilotStream(url: string | null) {
  const [events, setEvents] = useState<CopilotEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url) return;
    const es = new EventSource(url);
    esRef.current = es;
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as CopilotEvent;
        setEvents((prev) => [...prev.slice(-20), data]);
      } catch {}
    };
    return () => { es.close(); esRef.current = null; setConnected(false); };
  }, [url]);

  return { events, connected, disconnect: () => esRef.current?.close() };
}
