import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Creates a fresh temporary directory named `<prefix>-XXXXXX`.
 *
 * @param prefix The prefix for the temporary directory name.
 * @param parentDirectory Directory to create it under. Defaults to the OS
 *   temporary directory. Pass the eventual destination's own filesystem when
 *   the directory is staging for a `rename`, which is only atomic within one
 *   filesystem.
 * @returns A promise that resolves to the path of the newly created temporary
 *   directory.
 */
export function createTempDir(
	prefix: string,
	parentDirectory?: string,
): Promise<string> {
	return mkdtemp(join(parentDirectory ?? tmpdir(), `${prefix}-`));
}
