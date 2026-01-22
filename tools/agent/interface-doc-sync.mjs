import fs from "node:fs";
import path from "node:path";

export function readAgentInterfaceVersions(repoRoot = process.cwd()) {
  const codePath = path.join(repoRoot, "tools", "agent", "interface-version.mjs");
  const docsPath = path.join(repoRoot, "docs", "INTERFACES.md");

  const codeSrc = fs.readFileSync(codePath, "utf8");
  const docsSrc = fs.readFileSync(docsPath, "utf8");

  const codeVersion = codeSrc.match(/AGENT_INTERFACE_VERSION\s*=\s*"([^"]+)"/)?.[1] ?? null;
  const docsVersion = docsSrc.match(/Current version:\s*`(\d+\.\d+\.\d+)`/)?.[1] ?? null;

  return {
    codePath,
    docsPath,
    codeVersion,
    docsVersion,
    ok: Boolean(codeVersion && docsVersion && codeVersion === docsVersion),
  };
}
