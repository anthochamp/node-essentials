import {
	defaultVectorsRoot,
	resolveFixtureDir as resolveFixtureDirIn,
} from "@ac-kit/fixture-util";

/**
 * Root directory every fetched fixture is extracted under. Gitignored via the
 * repository's existing `.temp/` pattern — no separate entry needed.
 */
export const VECTORS_ROOT = defaultVectorsRoot(import.meta.url);

/**
 * Resolves the on-disk directory for a fetched fixture.
 *
 * @param root Root the fixture directories live under. Defaults to
 *   {@link VECTORS_ROOT}; overridable for testing.
 * @throws {Error} When `setup` has not been run for this id — a missing corpus
 *   must fail a consuming test, never silently skip it.
 */
export function resolveFixtureDir(
	id: string,
	root: string = VECTORS_ROOT,
): string {
	return resolveFixtureDirIn(id, root, "@ac-kit/fixture-x509");
}
