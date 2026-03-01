import { defaults, waitFor } from "@ac-essentials/misc-util";
import { getProcessesSnapshot } from "./get-processes-snapshot.js";

export type ProcessWaitPidOptions = {
	/**
	 * An optional AbortSignal that can be used to abort the operation.
	 */
	signal?: AbortSignal | null;

	/**
	 * If specified, the function will poll at the given interval (in milliseconds)
	 * to check if the process has terminated after sending the kill signal.
	 * Default is 50 ms.
	 */
	pollIntervalMs?: number;
};

export const PROCESS_WAIT_PID_DEFAULT_OPTIONS: Required<ProcessWaitPidOptions> =
	{
		signal: null,
		pollIntervalMs: 50,
	};

/**
 * Wait for a process by its PID to terminate.
 *
 * @param pid The PID of the process to wait.
 */
export async function processWaitPid(
	pid: number,
	options?: ProcessWaitPidOptions,
): Promise<void> {
	const effectiveOptions = defaults(options, PROCESS_WAIT_PID_DEFAULT_OPTIONS);

	await waitFor(
		async () => {
			const processes = await getProcessesSnapshot({
				filters: { id: pid },
				fields: ["id"],
				signal: effectiveOptions.signal,
			});

			return processes.length === 0;
		},
		{
			signal: effectiveOptions.signal,
			intervalMs: effectiveOptions.pollIntervalMs,
		},
	);
}
