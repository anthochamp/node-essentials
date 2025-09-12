import * as fs from "node:fs/promises";
import type { Callable } from "../ecma/function/types.js";
import { waitFor } from "../ecma/function/wait-for.js";
import { defaults } from "../ecma/object/defaults.js";
import { isNodeErrorWithCode } from "../node/error/node-error.js";
import type { ILockable } from "./ilockable.js";
import { LockableBase } from "./lockable-base.js";

export type LockFileOptions = {
	/**
	 * The interval in milliseconds to poll for the lock file to be released.
	 * Default is 50ms.
	 */
	pollIntervalMs?: number;
};

const LOCK_FILE_DEFAULT_OPTIONS: Required<LockFileOptions> = {
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
export class LockFile extends LockableBase implements ILockable {
	private readonly options: Required<LockFileOptions>;
	private lockHandle: fs.FileHandle | null = null;

	constructor(
		public readonly filePath: string,
		options?: LockFileOptions,
	) {
		super();

		this.options = defaults(options, LOCK_FILE_DEFAULT_OPTIONS);
	}

	get locked(): boolean {
		return this.lockHandle !== null;
	}

	async acquire(signal?: AbortSignal | null): Promise<Callable> {
		await waitFor(
			async () => {
				try {
					// if we manage to create the file, lockHandle should be null.
					this.lockHandle = await fs.open(`${this.filePath}.lock`, "wx");
				} catch (error) {
					if (isNodeErrorWithCode(error, "EEXIST")) {
						return false;
					}

					throw error;
				}
				return true;
			},
			{ signal, intervalMs: this.options.pollIntervalMs },
		);

		return () => this.release();
	}

	async release(): Promise<void> {
		if (!this.lockHandle) {
			throw new Error("Lock file is not acquired");
		}

		await this.lockHandle.close();
		this.lockHandle = null;
	}
}
