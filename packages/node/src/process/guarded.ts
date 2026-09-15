import { MaybePromiseLike } from "@ac-kit/core";

/**
 * Runs `work`, converting a process-level crash (a synchronous throw outside
 * any promise chain — a stray socket/timer callback, for instance) into a
 * rejection of the returned promise instead of letting it kill the process.
 *
 * @param work The function to run.
 * @returns A promise settling the same way `work` would have, had its crash
 *   been catchable normally.
 */
export function rejectOnUncaught<T>(
	work: () => MaybePromiseLike<T>,
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const onCrash = (error: Error) => reject(error);
		process.once("uncaughtException", onCrash);
		Promise.resolve()
			.then(work)
			.then(
				(value) => {
					process.off("uncaughtException", onCrash);
					resolve(value);
				},
				(error: unknown) => {
					process.off("uncaughtException", onCrash);
					reject(error as Error);
				},
			);
	});
}
