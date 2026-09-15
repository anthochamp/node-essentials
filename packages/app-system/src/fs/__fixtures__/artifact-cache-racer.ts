/**
 * Fixture for `artifact-cache.test.ts`'s cross-process tests. Several copies
 * run concurrently against one cache key, each appending a line to the marker
 * file from inside `build`.
 *
 * Usage: `<root> <markerFile> [mode] [lockWaitMs]`, where `mode` is `build`
 * (default) or `hang` — the latter never leaves `build` and ignores `SIGTERM`,
 * so the test can `SIGKILL` it and leave its lock file behind.
 */

import { appendFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { createArtifactCache } from "../artifact-cache.js";

const [root, markerFile, mode = "build", lockWaitMs] = process.argv.slice(2);

if (root === undefined || markerFile === undefined) {
	throw new Error(
		"usage: artifact-cache-racer <root> <markerFile> [mode] [lockWaitMs]",
	);
}

if (mode === "hang") {
	process.on("SIGTERM", () => {});
}

const cache = createArtifactCache({
	root,
	...(lockWaitMs === undefined
		? {}
		: { lockWaitMs: Number.parseInt(lockWaitMs, 10) }),
});

const directory = await cache.ensure(
	{ name: "raced", inputs: ["one shared input"] },
	async (staging) => {
		await appendFile(markerFile, `${mode}\n`);

		if (mode === "hang") {
			await new Promise(() => {});
		}

		// Widens the window in which every racer is inside `build` at once.
		await new Promise((resolve) => setTimeout(resolve, 250));
		await writeFile(join(staging, "artifact.txt"), "ok");
	},
);

process.stdout.write(`${directory}\n`);
