import { glob, readFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
	"..",
	"..",
	"..",
);

describe("dependency direction: @ac-kit never depends on @ac-bench", () => {
	it("no packages/**/package.json declares an @ac-bench/* dependency", async () => {
		const offenders: string[] = [];

		for await (const entry of glob("packages/**/package.json", {
			cwd: REPO_ROOT,
			exclude: ["**/node_modules/**"],
		})) {
			const manifest = JSON.parse(
				await readFile(path.join(REPO_ROOT, entry), "utf8"),
			) as {
				dependencies?: Record<string, string>;
				devDependencies?: Record<string, string>;
				peerDependencies?: Record<string, string>;
			};

			const allDependencyNames = [
				...Object.keys(manifest.dependencies ?? {}),
				...Object.keys(manifest.devDependencies ?? {}),
				...Object.keys(manifest.peerDependencies ?? {}),
			];

			if (allDependencyNames.some((name) => name.startsWith("@ac-bench/"))) {
				offenders.push(entry);
			}
		}

		expect(offenders).toEqual([]);
	});
});
