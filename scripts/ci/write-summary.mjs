const lines = [];

lines.push("# CI Summary");
lines.push(`- Commit: \`${(process.env.GITHUB_SHA || "local").slice(0, 7)}\``);
lines.push(`- Ref: \`${process.env.GITHUB_REF || "local"}\``);
lines.push(`- Run: ${process.env.GITHUB_RUN_ID || "local"}`);
lines.push("");
lines.push("## Gates");
lines.push("- workflow_lint: actionlint (pinned)");
lines.push("- ci:guard (repo truth)");
lines.push("- schemas: Ajv compile + lint");
lines.push("- openapi: redocly lint (pinned)");
lines.push("- typecheck");
lines.push("- ui build");
lines.push("- runbooks coverage + status codes contract");
lines.push("");

process.stdout.write(`${lines.join("\n")}\n`);
