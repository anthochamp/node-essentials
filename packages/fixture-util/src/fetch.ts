import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { unzipSync } from "fflate";

/** Downloads `url` and returns its raw bytes. */
export async function fetchArtifact(url: string): Promise<Uint8Array> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`GET ${url} -> ${response.status} ${response.statusText}`);
	}

	return new Uint8Array(await response.arrayBuffer());
}

/** Extracts every entry of a zip archive under `destination`. */
export async function extractZip(
	data: Uint8Array,
	destination: string,
): Promise<void> {
	const entries = unzipSync(data);

	for (const [name, content] of Object.entries(entries)) {
		// fflate represents a directory entry as a zero-length file ending in "/".
		if (content.length === 0 && (name + "").endsWith("/")) {
			continue;
		}

		const target = join(destination, name + "");
		await mkdir(dirname(target), { recursive: true });
		await writeFile(target, content);
	}
}
