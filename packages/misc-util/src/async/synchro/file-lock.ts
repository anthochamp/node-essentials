import * as fsPromises from "node:fs/promises";
import { waitFor } from "../../ecma/function/wait-for.js";
import { defaults } from "../../ecma/object/defaults.js";
import { isNodeErrorWithCode } from "../../node/error/node-error.js";
import { type ILock, LockNotAcquiredError } from "./ilock.js";

export type FileLockOptions = {
	/**
	 * The interval in milliseconds to poll for the lock file to be released.
	 * Default is 50ms.
	 */
	pollIntervalMs?: number;
};

const FILE_LOCK_DEFAULT_OPTIONS: Required<FileLockOptions> = {
	pollIntervalMs: 50,
};

/**
 * A simple file-based lock mechanism.
 *
 * Creates a `.lock` file to indicate that a resource is locked.
 * The lock is acquired by creating the lock file and released by deleting it.
 * If the lock file already exists, it means the resource is locked by another
 * process.
 *
 * Example usage:
 * ```ts
 * const lock = new LockFile("/path/to/resource");
 * const release = await lock.acquire();
 * try {
 *   // Do something with the locked resource
 * } finally {
 *   await release();
 * }
 * ```
 */
export class FileLock implements ILock {
	private readonly options: Required<FileLockOptions>;
	private lockHandle: fsPromises.FileHandle | null = null;

	constructor(
		public readonly filePath: string,
		options?: FileLockOptions,
	) {
		this.options = defaults(options, FILE_LOCK_DEFAULT_OPTIONS);
	}

	get locked(): boolean {
		return this.lockHandle !== null;
	}

	async tryLock(): Promise<boolean> {
		try {
			// Try to create the lock file exclusively
			this.lockHandle = await fsPromises.open(`${this.filePath}.lock`, "wx");
		} catch (error) {
			if (isNodeErrorWithCode(error, "EEXIST")) {
				return false;
			}

			throw error;
		}
		return true;
	}

	async lock(signal?: AbortSignal | null): Promise<void> {
		await waitFor(() => this.tryLock(), {
			signal,
			intervalMs: this.options.pollIntervalMs,
		});
	}

	async unlock(): Promise<void> {
		if (!this.lockHandle) {
			throw new LockNotAcquiredError();
		}

		const handle = this.lockHandle;
		this.lockHandle = null;

		await handle.close();
		await fsPromises.unlink(`${this.filePath}.lock`);
	}
}
