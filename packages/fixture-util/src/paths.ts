import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Default fixture root for a package: `<package root>/.temp/vectors`,
 * gitignored via the repository's existing `.temp/` pattern.
 *
 * @param packageMetaUrl `import.meta.url` of a module one directory level below
 *   the package root (e.g. the package's own `src/paths.ts`).
 */
export function defaultVectorsRoot(packageMetaUrl: string | URL): string {
	const packageRoot = fileURLToPath(new URL("..", packageMetaUrl));
	return join(packageRoot, ".temp", "vectors");
}

/**
 * Resolves the on-disk directory for a fetched fixture.
 *
 * @param id Fixture id — also its directory name under `root`.
 * @param root Root the fixture directories live under.
 * @param packageName The consuming package's name, used in the error's "run
 *   setup" hint.
 * @throws {Error} When `setup` has not been run for this id — a missing corpus
 *   must fail a consuming test, never silently skip it.
 */
export function resolveFixtureDir(
	id: string,
	root: string,
	packageName: string,
): string {
	const dir = join(root, id);

	if (!existsSync(dir)) {
		throw new Error(
			`fixture "${id}" is not present at ${dir} — run ` +
				`"yarn workspace ${packageName} run setup" first`,
		);
	}

	return dir;
}
