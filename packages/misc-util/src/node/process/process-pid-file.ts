import { existsSync, unlinkSync } from "node:fs";
import { unlink } from "node:fs/promises";
import type { Callable } from "../../ecma/function/types.js";
import { existsAsync } from "../fs/exists-async.js";
import { ExitManager, ExitManagerPriority } from "./exit-manager.js";
import { writePidFile } from "./pid-file.js";

/**
 * Class to manage a PID file for the current process.
 *
 * This class provides methods to write the current process PID to a specified
 * file and to remove the PID file when it is no longer needed.
 *
 * Note: The PID file is automatically removed when the process exits, if it
 * was created by this class instance.
 *
 * Example usage:
 * ```ts
 * const pidFile = new ProcessPidFile("/var/run/myapp.pid");
 * await pidFile.write();
 * // ... application logic ...
 * await pidFile.remove();
 * ```
 */
export class ProcessPidFile {
	private exitHandler: Callable | null = null;

	constructor(private readonly filePath: string) {}

	/**
	 * Writes the current process PID to the PID file and sets up a handler to
	 * remove the PID file on process exit.
	 *
	 * Note: If the process crashes or is forcefully terminated, the PID file may
	 * not be removed. In such cases, manual cleanup may be necessary.
	 *
	 * This method ensures that the directory for the PID file exists before writing
	 * the file.
	 */
	async write(): Promise<void> {
		await writePidFile(this.filePath, process.pid);

		this.exitHandler = ExitManager.getInstance().registerExitHandler(
			async () => {
				if (existsSync(this.filePath)) {
					unlinkSync(this.filePath);
				}
			},
			ExitManagerPriority.VERY_LATE,
		);
	}

	/**
	 * Removes the PID file if it exists and cleans up the exit handler.
	 */
	async remove(): Promise<void> {
		if (await existsAsync(this.filePath)) {
			await unlink(this.filePath);
		}

		this.exitHandler?.();
		this.exitHandler = null;
	}
}
