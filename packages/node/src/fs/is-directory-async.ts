import { stat } from "node:fs/promises";

/**
 * Tests whether `path` exists and is a directory. An unreadable or missing path
 * is `false`, never a throw — the caller asked a question, not for the reason
 * behind the answer.
 *
 * @param path The path to check.
 * @returns True when `path` resolves to a directory.
 */
export async function isDirectoryAsync(
	path: Parameters<typeof stat>[0],
): Promise<boolean> {
	try {
		return (await stat(path)).isDirectory();
	} catch {
		return false;
	}
}
