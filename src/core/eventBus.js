import { eventBus } from "../../ui/core/eventBus.js";

// Compatibility shim for patches/docs that refer to a sharedEventBus.
export const sharedEventBus = eventBus;
export { eventBus };
