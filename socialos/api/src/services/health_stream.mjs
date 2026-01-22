import { randomUUID } from "node:crypto";
import { incCounter, incCounterLabeled, setGauge } from "./metrics.mjs";

const clients = new Set(); // each: { res, id }

setGauge("health_sse_clients_connected", () => clients.size);

function safeWrite(client, chunk) {
  try {
    const ok = client.res.write(chunk);
    return ok !== false;
  } catch {
    return false;
  }
}

function dropClient(client) {
  clients.delete(client);
  try {
    client.res.end?.();
  } catch {
    // ignore
  }
}

export function addClient(res) {
  const id = (typeof randomUUID === "function" ? randomUUID() : null) || `${Date.now()}-${Math.random()}`;
  const client = { res, id };
  clients.add(client);
  return client;
}

export function removeClient(client) {
  clients.delete(client);
}

export function getClientCount() {
  return clients.size;
}

export function broadcastHealthEvent(event) {
  const source = String(event?.source || "unknown");
  incCounterLabeled("health_events_emitted_total", { source }, 1);
  const data = JSON.stringify({ type: "health_event", event });
  for (const c of clients) {
    const ok1 = safeWrite(c, `id: ${event?.event_key || ""}\n`);
    const ok2 = ok1 && safeWrite(c, `event: health_event\n`);
    const ok3 = ok2 && safeWrite(c, `data: ${data}\n\n`);
    if (!ok3) dropClient(c);
  }
}

export function broadcastPing(payload = {}) {
  incCounter("health_sse_ping_sent_total", 1);
  const data = JSON.stringify({ type: "ping", at: new Date().toISOString(), ...payload });
  for (const c of clients) {
    const ok1 = safeWrite(c, `event: ping\n`);
    const ok2 = ok1 && safeWrite(c, `data: ${data}\n\n`);
    if (!ok2) dropClient(c);
  }
}

// keepalive to keep proxies happy
export function startKeepalive(intervalMs = 25000) {
  const t = setInterval(() => {
    broadcastPing({ clients: clients.size });
  }, intervalMs);

  t.unref?.();
  return t;
}
