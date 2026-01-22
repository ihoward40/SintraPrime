import { EventEmitter } from "node:events";

class SintraEventBus extends EventEmitter {}

export const eventBus = new SintraEventBus();
