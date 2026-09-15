/**
 * Surfaces `error` as an uncaught exception without disturbing the current
 * execution flow.
 *
 * @param error The error to surface as an uncaught exception.
 */
export function throwOutOfBand(error: unknown): void {
	queueMicrotask(() => {
		throw error;
	});
}
