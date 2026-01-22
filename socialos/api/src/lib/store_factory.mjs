let storePromise = null;

export async function getStore() {
	if (storePromise) return storePromise;

	const mode = process.env.SOCIALOS_STORE || "dev"; // dev | postgres

	storePromise = (async () => {
		if (mode === "postgres") {
			const m = await import("./store_pg.mjs");
			return m.storePg;
		}

		const m = await import("./store_dev.mjs");
		return m.storeDev;
	})();

	return storePromise;
}
