import type { PathLike } from "node:fs";
import { unlink } from "node:fs/promises";
import { defaults, readPidFile } from "@ac-essentials/misc-util";
import {
	type ProcessWaitPidOptions,
	processWaitPid,
} from "./process-wait-pid.js";

export type ProcessKillByPidFileOptions = {
	/**
	 * An optional AbortSignal that can be used to abort the operation.
	 */
	signal?: AbortSignal | null;

	/**
	 * Wait options to use after sending the kill signal.
	 * Default is `{}` (wait for termination with default options).
	 *
	 * If `null`, the function will not wait for the process to terminate.
	 */
	waitOptions?: Omit<ProcessWaitPidOptions, "signal"> | null;
};

const PROCESS_KILL_BY_PID_FILE_DEFAULT_OPTIONS: Required<ProcessKillByPidFileOptions> =
	{
		signal: null,
		waitOptions: {},
	};

/**
 * Kill the process whose PID is stored in the PID file and optionally wait for it to terminate.
 *
 * Different signals can be used to terminate the process:
 * - 'SIGTERM' (default): Politely asks the process to terminate, allowing it to
 *  perform cleanup operations.
 * - 'SIGINT': Simulates an interrupt signal (like pressing Ctrl+C in a terminal).
 * 	This allows the process to handle the signal and perform any necessary cleanup.
 * - 'SIGKILL': Forces the process to terminate immediately. This signal cannot be
 *  caught or ignored by the process.
 *
 * If 'SIGKILL' is used, the PID file will be deleted automatically after the
 * process is killed. Other signals, which are catch-able, should allow the
 * process to handle its own cleanup, including removing the PID file if necessary.
 *
 * @param pidFile The path to the PID file.
 * @param signal The signal to send to the process
 */
export async function processKillByPidFile(
	pidFile: PathLike,
	killSignal: Parameters<typeof process.kill>[1],
	options?: ProcessKillByPidFileOptions,
): Promise<void> {
	const effectiveOptions = defaults(
		options,
		PROCESS_KILL_BY_PID_FILE_DEFAULT_OPTIONS,
	);

	const pid = await readPidFile(pidFile, {
		signal: effectiveOptions.signal ?? undefined,
	});

	process.kill(pid, killSignal);

	if (effectiveOptions.waitOptions !== null) {
		await processWaitPid(pid, {
			...effectiveOptions.waitOptions,
			signal: effectiveOptions.signal,
		});
	}

	if (killSignal === "SIGKILL") {
		try {
			await unlink(pidFile);
		} catch {}
	}
}
