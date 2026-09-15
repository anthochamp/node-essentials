/**
 * Blends smoothly between two values — `t = 0` gives `a`, `t = 1` gives `b`,
 * and `0.5` gives the midpoint.
 *
 * The workhorse behind animation easing, colour blending, fading between two
 * measurements, and reading a value off a curve you only sampled at intervals.
 *
 * `t` outside `[0, 1]` extrapolates rather than clamping, which is often what
 * you want and occasionally a bug; clamp it yourself if it should not.
 *
 * Computed as `a + (b - a) * t`, which is exact at `t = 0` but **not guaranteed
 * exact at `t = 1`** when `a` and `b` differ greatly in magnitude. If hitting
 * both endpoints exactly matters — sampling a function that is singular at one
 * end, for instance — use {@link linspace}, which is built for that.
 *
 * O(1) time, O(1) memory.
 *
 * @example
 * 	```ts
 * 	lerp(0, 100, 0.25); // 25
 * 	lerp(10, 20, 1.5); // 25 — extrapolates past the end
 * 	```;
 *
 * @param a Start value, returned at `t = 0`.
 * @param b End value, approached as `t` reaches 1.
 * @param t Interpolation factor. Typically in `[0, 1]`.
 * @returns The interpolated value.
 * @see {@link linspace} for a whole sequence of samples.
 */
export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}
