import { useCallback, useEffect, useRef, useState } from "react";

export function useHealthStream({ baseUrl, onEvent, onReset, enabled = true, onStatus } = {}) {
  const LS_KEY = "socialos_health_last_id";
  const esRef = useRef(null);
  const retryRef = useRef(0);
  const lastIdRef = useRef("");
  const [reconnectTick, setReconnectTick] = useState(0);
  const [paused, setPaused] = useState(false);

  const [cursor, setCursor] = useState(() => {
    try {
      const v = window?.localStorage?.getItem(LS_KEY) || "";
      lastIdRef.current = v ? String(v) : "";
      return lastIdRef.current;
    } catch {
      lastIdRef.current = "";
      return "";
    }
  });

  const setCursorId = useCallback((id) => {
    lastIdRef.current = id ? String(id) : "";
    setCursor(lastIdRef.current);
    try {
      window?.localStorage?.setItem(LS_KEY, lastIdRef.current);
    } catch {
      // ignore
    }
  }, []);

  const coldConnect = useCallback(() => {
    try {
      window?.localStorage?.removeItem(LS_KEY);
    } catch {
      // ignore
    }
    lastIdRef.current = "";
    setCursor("");

    if (esRef.current) {
      try {
        esRef.current.close();
      } catch {
        // ignore
      }
      esRef.current = null;
    }

    setPaused(false);
    setReconnectTick((x) => x + 1);
  }, []);

  const reconnect = useCallback(() => {
    if (esRef.current) {
      try {
        esRef.current.close();
      } catch {
        // ignore
      }
      esRef.current = null;
    }
    setPaused(false);
    setReconnectTick((x) => x + 1);
  }, []);

  const pause = useCallback(() => {
    setPaused(true);
    if (esRef.current) {
      try {
        esRef.current.close();
      } catch {
        // ignore
      }
      esRef.current = null;
    }
    onStatus?.("paused");
  }, [onStatus]);

  const resume = useCallback(() => {
    setPaused(false);
    setReconnectTick((x) => x + 1);
  }, []);

  useEffect(() => {
    if (!enabled || paused) return;

    let stopped = false;

    function connect() {
      if (stopped) return;
      onStatus?.("connecting");

      const url = `${baseUrl}/health/stream${lastIdRef.current ? `?since_event_key=${encodeURIComponent(lastIdRef.current)}` : ""}`;

      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        retryRef.current = 0;
        onStatus?.("connected");
      };

      es.addEventListener("health_event", (e) => {
        retryRef.current = 0;
        try {
          const msg = JSON.parse(e.data);
          const ev = msg?.event;
          if (ev?.event_key) setCursorId(ev.event_key);
          else if (e?.lastEventId) setCursorId(e.lastEventId);
          if (ev) onEvent?.(ev);
        } catch {
          // ignore
        }
      });

      es.addEventListener("reset", (e) => {
        try {
          const msg = JSON.parse(e.data);
          onReset?.(msg && typeof msg === "object" ? msg : (msg?.reason || "reset"));
        } catch {
          onReset?.("reset");
        }
      });

      es.onerror = () => {
        onStatus?.("reconnecting");
        es.close();
        const n = Math.min(10000, 500 * (2 ** retryRef.current++));
        setTimeout(connect, n);
      };
    }

    connect();
    return () => {
      stopped = true;
      esRef.current?.close();
      esRef.current = null;
    };
  }, [baseUrl, enabled, onEvent, onReset, onStatus, reconnectTick, setCursorId]);

  return { cursor, coldConnect, reconnect, pause, resume, paused };
}
