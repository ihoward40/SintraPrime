import { useEffect, useRef, useState } from "react";

export function useHealth({ apiBase, intervalMs = 30000 } = {}) {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const tokenRef = useRef(0);

  async function refresh() {
    const token = ++tokenRef.current;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${apiBase}/health`);
      const json = await res.json().catch(() => ({}));

      if (token !== tokenRef.current) return;

      if (!res.ok) {
        setHealth(json);
        setError(json?.error || `Health check failed (${res.status})`);
      } else {
        setHealth(json);
        setError(null);
      }
    } catch (e) {
      if (token !== tokenRef.current) return;
      setHealth(null);
      setError(String(e?.message || e));
    } finally {
      if (token !== tokenRef.current) return;
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    if (!intervalMs) return;
    const t = setInterval(refresh, intervalMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, intervalMs]);

  return { health, error, loading, refresh };
}
