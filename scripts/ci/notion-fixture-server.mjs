import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const PORT = Number(process.env.MOCK_NOTION_PORT ?? "8791");
const HOST = process.env.MOCK_NOTION_HOST ?? "127.0.0.1";

const fixturePath = path.resolve(process.cwd(), "fixtures", "notion", "mock_preflight.html");
if (!fs.existsSync(fixturePath)) {
  process.stderr.write(`[mock-notion] missing fixture: ${fixturePath}\n`);
  process.exit(2);
}

const fixtureHtml = fs.readFileSync(fixturePath, "utf8");

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (url.pathname === "/status" || url.pathname === "/status/200") {
    res.statusCode = 200;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (url.pathname === "/" || url.pathname === "/mock-notion.html") {
    res.statusCode = 200;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(fixtureHtml);
    return;
  }

  res.statusCode = 404;
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.end("not found");
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`[mock-notion] listening on http://${HOST}:${PORT}/\n`);
});
