import type { PathLike } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

/**
 * Read a PID from a file.
 *
 * @param path The path to the PID file.
 * @returns The PID read from the file.
 */
export async function readPidFile(
	path: PathLike,
	options?: Parameters<typeof readFile>[1],
): Promise<number> {
	const content = await readFile(path, options);

	const pid = parseInt(content.toString(), 10);
	if (Number.isNaN(pid)) {
		throw new Error(`Invalid PID in file: ${path}`);
	}

	return pid;
}

/**
 * Write a PID to a file.
 *
 * @param path The path to the PID file.
 * @param pid The PID to write to the file.
 */
export async function writePidFile(
	path: PathLike,
	pid: number,
	options?: Parameters<typeof writeFile>[2],
): Promise<void> {
	await writeFile(path, pid.toString(), options);
}
