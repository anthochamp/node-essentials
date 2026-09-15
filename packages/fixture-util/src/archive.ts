import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { verifyChecksum } from "./checksum.js";
import { extractZip, fetchArtifact } from "./fetch.js";
import type { FixtureEntryBase } from "./setup.js";

/** A fixture acquired as a single downloadable, checksummed archive or file. */
export interface ArchiveFixtureEntry extends FixtureEntryBase {
	/**
	 * Source URL. Pinned to a specific release, tag, or commit — never a moving
	 * branch — so a rebuild years from now fetches the same bytes.
	 */
	readonly url: string;

	/**
	 * Lowercase hex SHA-256 of the downloaded artifact, verified before any
	 * extraction. An unverified download is a supply-chain hole otherwise.
	 */
	readonly sha256: string;

	/**
	 * "raw": the downloaded file is the fixture itself. "zip": every entry in the
	 * archive is extracted under the fixture's directory.
	 */
	readonly extract: "raw" | "zip";
}

/**
 * Fetches, verifies and extracts (or writes) one {@link ArchiveFixtureEntry}.
 *
 * @throws {Error} When `entry.extract` is `"raw"` and no filename can be
 *   derived from `entry.url`.
 */
export async function setupArchiveFixture(
	entry: ArchiveFixtureEntry,
	destination: string,
): Promise<void> {
	const data = await fetchArtifact(entry.url);
	verifyChecksum(data, entry.sha256, entry.url);

	if (entry.extract === "zip") {
		await extractZip(data, destination);
		return;
	}

	const filename = new URL(entry.url).pathname.split("/").pop();

	if (!filename) {
		throw new Error(`cannot derive a filename from ${entry.url}`);
	}

	await writeFile(join(destination, filename), data);
}
