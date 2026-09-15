import { readFile, readdir } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_JSON = path.resolve(SRC_DIR, "..", "package.json");

// Built as a template rather than a literal, so this file's own text does not
// trip its own scan below.
const FORBIDDEN_PACKAGE_PREFIX = ["@ac-bench", "measure-"].join("/");
// Only matches an actual import specifier, not this prefix's mention in a doc
// comment (several files legitimately explain the boundary in prose).
const FORBIDDEN_IMPORT = new RegExp(
	`from\\s+["']${FORBIDDEN_PACKAGE_PREFIX}|import\\(\\s*["']${FORBIDDEN_PACKAGE_PREFIX}`,
);

/** Strips comments so a doc-comment example doesn't look like real code. */
function withoutComments(content: string): string {
	return content.replaceAll(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
}

describe("structure: lib has no concrete measure types", () => {
	it("no source file imports a @ac-bench/measure-* package", async () => {
		const entries = await readdir(SRC_DIR, { recursive: true });
		const sourceFiles = entries.filter(
			(entry) =>
				entry.endsWith(".ts") &&
				!entry.endsWith(".test.ts") &&
				entry !== path.basename(fileURLToPath(import.meta.url)),
		);

		const offenders: string[] = [];
		for (const file of sourceFiles) {
			const content = await readFile(path.join(SRC_DIR, file), "utf8");
			if (FORBIDDEN_IMPORT.test(withoutComments(content))) {
				offenders.push(file);
			}
		}

		expect(offenders).toEqual([]);
	});

	it("package.json does not depend on any @ac-bench/measure-* package", async () => {
		const manifest = JSON.parse(await readFile(PACKAGE_JSON, "utf8")) as {
			dependencies?: Record<string, string>;
			devDependencies?: Record<string, string>;
		};

		const allDependencyNames = [
			...Object.keys(manifest.dependencies ?? {}),
			...Object.keys(manifest.devDependencies ?? {}),
		];

		expect(
			allDependencyNames.filter((name) =>
				name.startsWith(FORBIDDEN_PACKAGE_PREFIX),
			),
		).toEqual([]);
	});
});
