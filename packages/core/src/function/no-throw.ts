import { rejectOutOfBand } from "../error/reject-out-of-band.js";
import { throwOutOfBand } from "../error/throw-out-of-band.js";
import type { Callable, MaybeAsyncCallable } from "../types/callable.js";
import { MaybePromiseLike } from "../types/promise.js";

/**
 * Calls a function, containing any error it throws — the error still surfaces,
 * out of band (via `queueMicrotask`), instead of propagating to this call's
 * caller.
 *
 * Note: this does not handle promise rejections. For async functions, use
 * {@link catchOutOfBandApplyAsync}.
 *
 * @param func The function to call.
 * @param args Arguments to pass to it.
 * @returns The function's result, or `undefined` if it threw.
 */
export function catchOutOfBandApply<A extends unknown[], R>(
	func: Callable<A, R>,
	args: A,
): R | undefined {
	try {
		return func.apply(undefined, args);
	} catch (error) {
		throwOutOfBand(error);
	}
}

/**
 * Calls a function, containing any error it throws or rejects with — the error
 * still surfaces, out of band, instead of propagating to this call's caller.
 *
 * @param func The function to call.
 * @param args Arguments to pass to it.
 * @returns The function's result, or `undefined` if it threw or rejected.
 */
export async function catchOutOfBandApplyAsync<A extends unknown[], R>(
	func: MaybeAsyncCallable<A, R>,
	args: A,
): Promise<R | undefined> {
	let result: MaybePromiseLike<R>;
	try {
		result = func.apply(undefined, args);
	} catch (error) {
		throwOutOfBand(error);
		return;
	}

	try {
		return await result;
	} catch (error) {
		rejectOutOfBand(error);
	}
}

/**
 * Runs `work`, containing any error it throws. See {@link catchOutOfBandApply}.
 *
 * @param work The action to run.
 * @returns `work`'s result, or `undefined` if it threw.
 */
export function catchOutOfBand<T>(work: Callable<[], T>): T | undefined {
	return catchOutOfBandApply(work, []);
}

/**
 * Runs `work`, containing any error it throws or rejects with. See
 * {@link catchOutOfBandApplyAsync}.
 *
 * @param work The action to run.
 * @returns `work`'s result, or `undefined` if it threw or rejected.
 */
export function catchOutOfBandAsync<T>(
	work: MaybeAsyncCallable<[], T>,
): Promise<T | undefined> {
	return catchOutOfBandApplyAsync(work, []);
}
