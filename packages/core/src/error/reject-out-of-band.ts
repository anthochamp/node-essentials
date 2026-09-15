/**
 * Surfaces `error` as an unhandled rejection, so a rejection stays a rejection
 * rather than being promoted to an exception.
 *
 * @param error The error to surface as an unhandled rejection.
 */
export function rejectOutOfBand(error: unknown): void {
	queueMicrotask(() => {
		void Promise.reject(error);
	});
}
