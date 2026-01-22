import { getStore } from "../lib/store_factory.mjs";

const store = await getStore();
console.log("store_factory loaded. keys:", Object.keys(store));
