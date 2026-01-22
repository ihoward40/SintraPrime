import { useEffect, useRef, useState } from "react";

export function useHealthHistory({ apiBase, limit = 20, intervalMs = 0 } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const tokenRef = useRef(0);

  async function refresh() {
    const token = ++tokenRef.current;
    setError(null);

    try {
      const url = `${apiBase}/health/history?limit=${encodeURIComponent(limit)}`;
      const res = await fetch(url);
      const json = await res.json().catch(() => null);

      if (token !== tokenRef.current) return;

      if (!res.ok) {
        setData(json);
        setError(json?.error || `history failed (${res.status})`);
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
  }, [apiBase, limit, intervalMs]);

  return { data, error, refresh };
}
