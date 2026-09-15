import { MaybePromiseLike } from "../types/promise.js";

/**
 * Runs `work`, discarding any error it throws or rejects with.
 *
 * Unlike {@link catchOutOfBandAsync}, which still surfaces the error out of band
 * via `queueMicrotask`, this truly discards it — for a best-effort action whose
 * failure must never be reported at all (e.g. a `catch` block's own teardown,
 * which must not mask the failure that made it necessary in the first place).
 *
 * @param work Action to run. Omitted (or `null`) is a no-op.
 * @returns The resolved value, or `undefined` if `work` threw or rejected.
 */
export async function catchSilentlyAsync<T>(
	work?: (() => MaybePromiseLike<T>) | null,
): Promise<T | undefined> {
	try {
		return await work?.();
	} catch {
		return undefined;
	}
}

/**
 * Runs `work`, discarding any error it throws. See {@link catchSilentlyAsync}.
 *
 * @param work Action to run. Omitted (or `null`) is a no-op.
 * @returns `work`'s result, or `undefined` if it threw.
 */
export function catchSilently<T>(work?: (() => T) | null): T | undefined {
	try {
		return work?.();
	} catch {
		return undefined;
	}
}
