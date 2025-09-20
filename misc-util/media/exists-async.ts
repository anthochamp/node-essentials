import { access, constants } from "node:fs/promises";

/**
 * Tests whether the given file is visible by the calling process.
 *
 * @param path The file path to check for existence.
 * @returns True if the file is visible by the calling process, false otherwise.
 */
export async function existsAsync(
	path: Parameters<typeof access>[0],
): Promise<boolean> {
	try {
		await access(path, constants.F_OK);
	} catch {
		return false;
	}
	return true;
}
