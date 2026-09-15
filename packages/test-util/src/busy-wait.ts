/**
 * Blocks the thread synchronously for `durationMs`.
 *
 * Deliberately synchronous and busy: the point is to hold the event loop, and
 * anything that yields (a timer, an `await`) would not.
 */
export function busyWaitSync(durationMs: number): void {
	const deadline = performance.now() + durationMs;
	while (performance.now() < deadline) {
		// Spin.
	}
}
