import net from "node:net";

async function isPortOpen(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(300);

    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.once("error", () => {
      resolve(false);
    });

    socket.connect(port, host);
  });
}

async function checkPort(port) {
  return (await isPortOpen("127.0.0.1", port)) || (await isPortOpen("localhost", port));
}

const includeUi = process.env.SOCIALOS_UI !== "0";

const ports = [{ name: "API", port: 8787 }, ...(includeUi ? [{ name: "UI", port: 5175 }] : [])];

for (const p of ports) {
  const inUse = await checkPort(p.port);
  if (inUse) {
    console.error(`[preflight] ${p.name} port ${p.port} appears in use. Close existing process or change port.`);
    process.exit(2);
  }
}

console.log("[preflight] Ports look free.");
