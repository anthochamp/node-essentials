import { isNodeErrorWithCode, spawnProcess } from "@ac-kit/node";

export type HasBinaryOptions = {
	/** Working directory for the resolver process. Default: `process.cwd()`. */
	cwd?: string;

	/**
	 * Environment variables for the resolver process (affects `PATH`). Default:
	 * `process.env`.
	 */
	env?: NodeJS.ProcessEnv;

	/** Aborts the check. */
	signal?: AbortSignal;
};

/**
 * Check whether a binary is available on `PATH`.
 *
 * Delegates to the platform's own resolver (`which` on POSIX, `where` on
 * Windows) instead of re-implementing `PATH`/`PATHEXT` lookup.
 *
 * @param command Executable name.
 * @param options
 * @returns `true` unless the command cannot be found.
 * @throws {Error} If the platform resolver itself (`which`/`where`) is not
 *   available on this system.
 */
export async function hasBinary(
	command: string,
	options?: HasBinaryOptions,
): Promise<boolean> {
	const resolver = process.platform === "win32" ? "where" : "which";

	try {
		await spawnProcess(resolver, [command], {
			cwd: options?.cwd,
			env: options?.env,
			signal: options?.signal,
		});
		return true;
	} catch (error) {
		if (isNodeErrorWithCode(error, "ENOENT")) {
			throw new Error(`"${resolver}" is not available on this system`);
		}

		if (options?.signal?.aborted) {
			throw error;
		}

		// which/where exit non-zero specifically to report "not found".
		return false;
	}
}
