import type { Command } from "commander";

declare module "./registerClickOps.js" {
  export function registerClickOps(program: Command): void;
}
