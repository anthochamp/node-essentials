/// <reference types="node" />
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { resolveFixtureDir } from "./paths.js";

/**
 * Reads a text file out of a fetched fixture corpus.
 *
 * @param fixtureId A {@link FixtureEntry.id} from `manifest.ts`.
 * @param relativePath Path within that fixture's directory — e.g. a `.rsp` file
 *   name, or `"<subdir>/<file>"` for a corpus with nested archive contents.
 * @throws {Error} When `setup` has not been run for this fixture (via
 *   {@link resolveFixtureDir}), or the file itself does not exist within an
 *   otherwise-present fixture directory.
 */
export async function readVectorFile(
	fixtureId: string,
	relativePath: string,
): Promise<string> {
	const fixtureDir = resolveFixtureDir(fixtureId);

	try {
		return await readFile(join(fixtureDir, relativePath), "utf8");
	} catch (cause) {
		throw new Error(
			`"${relativePath}" is not present in fixture "${fixtureId}" at ` +
				`${fixtureDir} — the corpus may be incomplete; try re-running ` +
				'"yarn workspace @ac-kit/fixture-crypto run setup"',
			{ cause },
		);
	}
}
