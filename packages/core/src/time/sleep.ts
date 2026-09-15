/**
 * Sleep for a specified number of milliseconds, aborting early if `signal`
 * fires.
 *
 * @param ms The number of milliseconds to sleep.
 * @param signal An optional AbortSignal to cancel the sleep.
 * @returns A Promise that resolves after the specified duration.
 */
export function sleep(ms: number, signal?: AbortSignal | null): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(signal.reason);
			return;
		}
		const timer = setTimeout(resolve, ms);
		signal?.addEventListener(
			"abort",
			() => {
				clearTimeout(timer);
				reject(signal.reason);
			},
			{ once: true },
		);
	});
}
