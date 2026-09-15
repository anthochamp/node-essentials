/** Where a bouncing position landed, and which way it is now travelling. */
export type PingpongStep = {
	/** The new position, always within `[0, max]`. */
	value: number;
	/** Which sign the next `delta` should carry. */
	direction: 1 | -1;
};

/**
 * Moves a position along a line and bounces it off both ends — the motion of a
 * pendulum, a loading indicator sweeping back and forth, or a value cycling
 * through a range without jumping.
 *
 * Call it once per frame or tick, feeding the returned `value` back in as
 * `current` and multiplying your step size by the returned `direction`. That
 * one returned sign is what saves the caller from tracking the bounce itself.
 *
 * Reaching or passing either end clamps to that end and flips the direction, so
 * the position can never escape `[0, max]` however large `delta` is. A single
 * overshooting step therefore loses the excess rather than reflecting it.
 *
 * O(1) time; allocates one small object per call, so hoist the destructuring
 * rather than the call if this runs per element.
 *
 * @example
 * 	```ts
 * 	let { value, direction } = { value: 8, direction: 1 as 1 | -1 };
 * 	({ value, direction } = pingpongStep(value, 3 * direction, 10));
 * 	// value: 10, direction: -1 — hit the end and turned round
 * 	({ value, direction } = pingpongStep(value, 3 * direction, 10));
 * 	// value: 7, direction: -1
 * 	```;
 *
 * @param current Where the position is now, within `[0, max]`.
 * @param delta How far to move; the sign sets the direction of travel.
 * @param max The upper end of the line. The lower end is always 0.
 * @returns The new position and the direction for the next step.
 */
export function pingpongStep(
	current: number,
	delta: number,
	max: number,
): PingpongStep {
	const next = current + delta;
	if (next >= max) {
		return { value: max, direction: -1 };
	}
	if (next <= 0) {
		return { value: 0, direction: 1 };
	}
	return { value: next, direction: delta >= 0 ? 1 : -1 };
}
