import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

/** Minimal shape a fixture manifest entry must have. */
export interface FixtureEntryBase {
	/** Unique id; also the directory name under the vectors root. */
	readonly id: string;

	/** Human-readable description, printed while `setup` fetches it. */
	readonly description: string;
}

/**
 * Runs `setupOne` for every entry in `manifest`, sequentially: logs progress,
 * clears any stale directory, and recreates it before delegating.
 *
 * Each package supplies its own `setupOne` (fetch a plain file, fetch and
 * extract a zip, or a git sparse checkout) — this only owns the repeated shell
 * around that per-entry work.
 *
 * @param manifest Entries describing what to fetch.
 * @param vectorsRoot Root directory every entry is extracted under.
 * @param setupOne Fetches (and verifies, and extracts) one entry into its
 *   freshly-created destination directory.
 */
export async function runFixtureSetup<T extends FixtureEntryBase>(
	manifest: readonly T[],
	vectorsRoot: string,
	setupOne: (entry: T, destination: string) => Promise<void>,
): Promise<void> {
	for (const entry of manifest) {
		console.log(`fetching ${entry.id} — ${entry.description}`);

		const destination = join(vectorsRoot, entry.id);
		await rm(destination, { recursive: true, force: true });
		await mkdir(destination, { recursive: true });

		await setupOne(entry, destination);
	}
}
