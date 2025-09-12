import { defaults } from "../object/defaults.js";
import { sleep } from "../timers/sleep.js";
import type { MaybeAsyncPredicate } from "./types.js";

export type WaitForOptions = {
	// An optional AbortSignal to cancel the wait operation.
	signal?: AbortSignal | null;

	// Interval between checks in milliseconds. Default is 50 ms.
	intervalMs?: number;
};

export const WAIT_FOR_DEFAULT_OPTIONS: Required<WaitForOptions> = {
	signal: null,
	intervalMs: 50,
};

/**
 * Waits until the provided condition function returns true.
 *
 * The condition function can be synchronous or asynchronous (returning a Promise).
 * The function checks the condition at regular intervals specified by `intervalMs`.
 *
 * Note: This function shouldn't be used inplace of the `vi.waitFor` function
 * from Vitest. This function is meant to be used in non-test code.
 *
 * @param predicate A function that returns a boolean or a Promise that resolves to a boolean.
 * @param options Options for configuring the wait behavior.
 */
export async function waitFor(
	predicate: MaybeAsyncPredicate,
	options?: WaitForOptions,
): Promise<void> {
	const effectiveOptions = defaults(options, WAIT_FOR_DEFAULT_OPTIONS);

	while (!(await predicate.call(undefined))) {
		effectiveOptions.signal?.throwIfAborted();

		await sleep(effectiveOptions.intervalMs);
	}
}
