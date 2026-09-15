import { readFile, readdir } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const PLUGIN_DIR = path.dirname(fileURLToPath(import.meta.url));

describe("module graph: @ac-bench/core/plugin never imports ./runner", () => {
	it("no source file reaches the runner subpath", async () => {
		const entries = await readdir(PLUGIN_DIR, { recursive: true });
		const sourceFiles = entries.filter(
			(entry) => entry.endsWith(".ts") && !entry.endsWith(".test.ts"),
		);

		const offenders: string[] = [];
		for (const file of sourceFiles) {
			const content = await readFile(path.join(PLUGIN_DIR, file), "utf8");
			if (/\.\.\/runner|@ac-bench\/core\/runner/.test(content)) {
				offenders.push(file);
			}
		}

		expect(offenders).toEqual([]);
	});
});
