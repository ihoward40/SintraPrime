import { AGENT_INTERFACE, AGENT_INTERFACE_VERSION } from "./interface-version.mjs";

export function emitOneLineJSON(obj) {
  process.stdout.write(
    `${JSON.stringify({
      ...(obj && typeof obj === "object" ? obj : { ok: false, error: "emitOneLineJSON: non-object payload" }),
      interface: AGENT_INTERFACE,
      interface_version: AGENT_INTERFACE_VERSION,
    })}\n`
  );
}
