import { useEffect, useRef, useState } from "react";

export function useHealthLastChange({ apiBase, sinceSeconds = 300, intervalMs = 30000 } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const tokenRef = useRef(0);

  async function refresh() {
    const token = ++tokenRef.current;
    setError(null);

    try {
      const url = `${apiBase}/health/history/last-change?since_seconds=${encodeURIComponent(sinceSeconds)}`;
      const res = await fetch(url);
      const json = await res.json().catch(() => null);

      if (token !== tokenRef.current) return;

      if (!res.ok) {
        setData(json);
        setError(json?.error || `last-change failed (${res.status})`);
      } else {
        setData(json);
      }
    } catch (e) {
      if (token !== tokenRef.current) return;
      setData(null);
      setError(String(e?.message || e));
    }
  }

  useEffect(() => {
    refresh();
    if (!intervalMs) return;
    const t = setInterval(refresh, intervalMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, sinceSeconds, intervalMs]);

  return { data, error, refresh };
}
