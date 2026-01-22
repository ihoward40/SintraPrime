import fs from "node:fs/promises";
import path from "node:path";
import * as ts from "typescript";

function die(msg: string): never {
  process.stderr.write(msg + "\n");
  process.exit(2);
}

function normalizeRel(p: string) {
  return p.replaceAll("\\\\", "/");
}

function isAllowed(rel: string, allowPrefixes: string[]): boolean {
  return allowPrefixes.some((p) => rel === p || rel.startsWith(p));
}

async function listFilesRecursive(rootAbs: string, relDir = ""): Promise<string[]> {
  const dirAbs = path.join(rootAbs, relDir);
  const entries = await fs.readdir(dirAbs, { withFileTypes: true });

  const out: string[] = [];
  for (const ent of entries) {
    if (ent.name === "node_modules" || ent.name === "dist" || ent.name === ".git") continue;

    const rel = relDir ? `${relDir}/${ent.name}` : ent.name;
    if (ent.isDirectory()) {
      out.push(...(await listFilesRecursive(rootAbs, rel)));
    } else {
      out.push(rel);
    }
  }
  return out;
}

function isSourceFile(rel: string): boolean {
  return /\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(rel);
}

function scriptKindForFile(rel: string): ts.ScriptKind {
  if (rel.endsWith(".ts")) return ts.ScriptKind.TS;
  if (rel.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (rel.endsWith(".jsx")) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
}

type Finding = {
  file: string;
  line: number;
  col: number;
  snippet: string;
};

type ModuleName =
  | "undici"
  | "axios"
  | "got"
  | "node:http"
  | "http"
  | "node:https"
  | "https"
  | "node:net"
  | "net"
  | "node:tls"
  | "tls";

type Binding =
  | { kind: "module"; module: ModuleName }
  | { kind: "named"; module: ModuleName; name: string };

const NETWORK_MODULES: Set<string> = new Set([
  "undici",
  "axios",
  "got",
  "node:http",
  "http",
  "node:https",
  "https",
  "node:net",
  "net",
  "node:tls",
  "tls",
]);

function asModuleName(s: string): ModuleName | null {
  return NETWORK_MODULES.has(s) ? (s as ModuleName) : null;
}

function getImportBindings(sf: ts.SourceFile): Map<string, Binding> {
  const map = new Map<string, Binding>();

  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (!stmt.moduleSpecifier || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const mod = asModuleName(stmt.moduleSpecifier.text);
    if (!mod) continue;

    const clause = stmt.importClause;
    if (!clause) continue;

    if (clause.name) {
      map.set(clause.name.text, { kind: "module", module: mod });
    }

    const nb = clause.namedBindings;
    if (!nb) continue;

    if (ts.isNamespaceImport(nb)) {
      map.set(nb.name.text, { kind: "module", module: mod });
    } else if (ts.isNamedImports(nb)) {
      for (const el of nb.elements) {
        const localName = el.name.text;
        const importedName = (el.propertyName ?? el.name).text;
        map.set(localName, { kind: "named", module: mod, name: importedName });
      }
    }
  }

  return map;
}

function propagateSimpleAliases(sf: ts.SourceFile, bindings: Map<string, Binding>) {
  // Low-noise aliasing:
  // - const x = https;
  // - const x = cond ? https : http;
  // - const x = (cond ? https : http);
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name)) continue;
      if (!decl.initializer) continue;

      const target = decl.name.text;

      const init = decl.initializer;
      if (ts.isIdentifier(init)) {
        const src = bindings.get(init.text);
        if (src?.kind === "module") bindings.set(target, src);
        continue;
      }

      if (ts.isParenthesizedExpression(init) && ts.isConditionalExpression(init.expression)) {
        const { whenTrue, whenFalse } = init.expression;
        if (ts.isIdentifier(whenTrue) && ts.isIdentifier(whenFalse)) {
          const a = bindings.get(whenTrue.text);
          const b = bindings.get(whenFalse.text);
          if (a?.kind === "module" && b?.kind === "module" && (a.module === "node:http" || a.module === "http" || a.module === "node:https" || a.module === "https")) {
            // Pick one; detection only needs to know it's a network lib.
            bindings.set(target, a);
          }
        }
      }

      if (ts.isConditionalExpression(init)) {
        const { whenTrue, whenFalse } = init;
        if (ts.isIdentifier(whenTrue) && ts.isIdentifier(whenFalse)) {
          const a = bindings.get(whenTrue.text);
          const b = bindings.get(whenFalse.text);
          if (a?.kind === "module" && b?.kind === "module") {
            bindings.set(target, a);
          }
        }
      }
    }
  }
}

function buildConstStringMap(sf: ts.SourceFile): Map<string, string> {
  // Conservative, low-noise propagation for dynamic imports:
  // - const x = "node:net";
  // - const y = x;
  // Same file, top-level only. No expressions, no env vars, no templates.
  const map = new Map<string, string>();
  const alias = new Map<string, string>();

  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    const isConst = (stmt.declarationList.flags & ts.NodeFlags.Const) !== 0;
    if (!isConst) continue;

    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name)) continue;
      if (!decl.initializer) continue;
      const name = decl.name.text;

      if (ts.isStringLiteral(decl.initializer)) {
        map.set(name, decl.initializer.text);
        continue;
      }

      if (ts.isIdentifier(decl.initializer)) {
        alias.set(name, decl.initializer.text);
      }
    }
  }

  // One-hop aliasing, plus a small safety loop bound.
  for (const [k, v] of alias.entries()) {
    let cur = v;
    for (let i = 0; i < 3; i++) {
      const s = map.get(cur);
      if (s !== undefined) {
        map.set(k, s);
        break;
      }
      const next = alias.get(cur);
      if (!next) break;
      cur = next;
    }
  }

  return map;
}

function isAxiosMethod(name: string): boolean {
  return new Set(["request", "get", "post", "put", "patch", "delete", "head", "options"]).has(name);
}

function isGotMethod(name: string): boolean {
  return new Set(["get", "post", "put", "patch", "delete", "head", "options", "stream"]).has(name);
}

function isHttpMethod(name: string): boolean {
  return name === "request" || name === "get";
}

function isNetCall(name: string): boolean {
  return name === "connect" || name === "createConnection";
}

function isTlsCall(name: string): boolean {
  return name === "connect";
}

function findNetworkCalls(sourceText: string, fileName: string): Finding[] {
  const sf = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, scriptKindForFile(fileName));
  const findings: Finding[] = [];

  const bindings = getImportBindings(sf);
  propagateSimpleAliases(sf, bindings);
  const constStrings = buildConstStringMap(sf);

  function record(node: ts.Node, label: string) {
    const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    const snippet = sourceText
      .slice(node.getStart(sf), Math.min(node.getEnd(), node.getStart(sf) + 140))
      .replaceAll("\n", " ")
      .trim();

    findings.push({ file: fileName, line: line + 1, col: character + 1, snippet: `${label}: ${snippet}` });
  }

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const expr = node.expression;

      // Dynamic import("node:https") etc.
      if (expr.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length >= 1) {
        const a0 = node.arguments[0];
        if (ts.isStringLiteral(a0) && asModuleName(a0.text)) {
          record(expr, `import(${a0.text})`);
        }

        // Conservative propagation: import(ident) where ident is const string literal (or trivial alias)
        if (ts.isIdentifier(a0)) {
          const v = constStrings.get(a0.text);
          if (v && asModuleName(v)) {
            record(expr, `import(${v}) via const ${a0.text}`);
          }
        }
      }

      // `fetch(...)`
      if (ts.isIdentifier(expr) && expr.text === "fetch") {
        record(expr, "fetch");
      }

      // Identifier call (e.g. got(...), axios(...), request(...) from undici)
      if (ts.isIdentifier(expr)) {
        const b = bindings.get(expr.text);
        if (b?.kind === "module") {
          if (b.module === "axios") record(expr, "axios()")
          if (b.module === "got") record(expr, "got()")
          if (b.module === "undici") record(expr, "undici()");
        }
        if (b?.kind === "named") {
          if (b.module === "undici" && (b.name === "request" || b.name === "fetch")) record(expr, `undici.${b.name}()`);
          if ((b.module === "node:http" || b.module === "http" || b.module === "node:https" || b.module === "https") && isHttpMethod(b.name)) {
            record(expr, `${b.module}.${b.name}()`);
          }
        }
      }

      // `globalThis.fetch(...)`, `something.fetch(...)`
      if (ts.isPropertyAccessExpression(expr) && expr.name.text === "fetch") {
        record(expr, "*.fetch");
      }

      // Module-qualified calls: https.request(...), undici.request(...), axios.post(...), got.get(...)
      if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.expression)) {
        const base = expr.expression.text;
        const prop = expr.name.text;
        const b = bindings.get(base);

        if (b?.kind === "module") {
          if ((b.module === "node:https" || b.module === "https" || b.module === "node:http" || b.module === "http") && isHttpMethod(prop)) {
            record(expr, `${b.module}.${prop}()`);
          }
          if (b.module === "undici" && (prop === "request" || prop === "fetch")) {
            record(expr, `undici.${prop}()`);
          }
          if (b.module === "axios" && (isAxiosMethod(prop) || prop === "create")) {
            // create() is often used to make a client used for requests.
            record(expr, `axios.${prop}()`);
          }
          if (b.module === "got" && isGotMethod(prop)) {
            record(expr, `got.${prop}()`);
          }

          // Ultra-precise socket-level side doors.
          if ((b.module === "node:net" || b.module === "net") && isNetCall(prop)) {
            record(expr, `${b.module}.${prop}()`);
          }
          if ((b.module === "node:tls" || b.module === "tls") && isTlsCall(prop)) {
            record(expr, `${b.module}.${prop}()`);
          }
        }
      }
    }

    // new net.Socket(), new tls.TLSSocket()
    if (ts.isNewExpression(node)) {
      const expr = node.expression;
      if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.expression)) {
        const base = expr.expression.text;
        const prop = expr.name.text;
        const b = bindings.get(base);

        if (b?.kind === "module") {
          if ((b.module === "node:net" || b.module === "net") && prop === "Socket") {
            record(expr, `${b.module}.Socket (new)`);
          }
          if ((b.module === "node:tls" || b.module === "tls") && prop === "TLSSocket") {
            record(expr, `${b.module}.TLSSocket (new)`);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);
  return findings;
}

async function main() {
  const argv = process.argv.slice(2);
  const rootIdx = argv.indexOf("--root");
  const rootArg = rootIdx >= 0 ? argv[rootIdx + 1] : "src";
  const roots = rootArg
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const allowIdx = argv.indexOf("--allow");
  const allowArg = allowIdx >= 0 ? argv[allowIdx + 1] : "";

  const allowPrefixes = [
    // Core choke point(s)
    "src/executor/",

    // Existing, explicitly-allowed fetch callers (tighten over time)
    "src/adapters/",
    "src/llm/",
    "src/integrations/gamma/",
    "src/persist/",
    "src/operator-ui/static/",

    // Single-file allow exceptions
    "src/agents/sendMessage.ts",
    "src/cli/run-operator-ui.ts",

    // Known legacy side-door (tight explicit allow; prefer refactor into executor over time)
    "src/speech/sinks/webhookSink.ts",
  ].concat(
    allowArg
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );

  const workspaceRoot = process.cwd();
  const relFiles: string[] = [];

  for (const root of roots) {
    const targetAbs = path.resolve(workspaceRoot, root);
    try {
      const stats = await fs.stat(targetAbs);
      if (stats.isFile()) {
        relFiles.push(normalizeRel(path.relative(workspaceRoot, targetAbs)));
      } else {
        relFiles.push(
          ...(await listFilesRecursive(workspaceRoot, normalizeRel(path.relative(workspaceRoot, targetAbs))))
            .map(normalizeRel)
            .filter((f) => f.startsWith(normalizeRel(root)))
        );
      }
    } catch {
      die(`no-direct-fetch: root not found: ${targetAbs}`);
    }
  }

  const findings: Finding[] = [];

  for (const rel of relFiles) {
    if (!isSourceFile(rel)) continue;
    if (isAllowed(rel, allowPrefixes)) continue;

    const abs = path.join(workspaceRoot, rel);
    const text = await fs.readFile(abs, "utf8");
    for (const f of findNetworkCalls(text, rel)) {
      findings.push(f);
    }
  }

  if (findings.length) {
    process.stderr.write("NO_DIRECT_FETCH_VIOLATIONS\n");
    for (const f of findings) {
      process.stderr.write(`${f.file}:${f.line}:${f.col} ${f.snippet}\n`);
    }
    process.stderr.write(
      "\nRoute networking through executor plan steps. If you truly need a direct network primitive, create a single vetted wrapper and allowlist that exact file explicitly.\n"
    );
    process.exit(1);
  }

  process.stdout.write("NO_DIRECT_FETCH_OK\n");
}

main().catch((e) => {
  die(`no-direct-fetch: fatal: ${e?.stack ?? String(e)}`);
});
