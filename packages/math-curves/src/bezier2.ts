import type { Vec2 } from "@ac-kit/math-linear";
import { dotPrecise } from "@ac-kit/math-scalar";

/**
 * Evaluates a quadratic Bézier curve at parameter `t` using the Bernstein form:
 *
 * ```text
 * B(t) = (1 − t)²·p0 + 2(1 − t)t·p1 + t²·p2
 * ```
 *
 * The curve starts at `p0`, ends at `p2`, and is tangent to `p0 → p1` and `p1 →
 * p2` at its endpoints; it does not pass through `p1`.
 *
 * @param p0 - Start point.
 * @param p1 - Control point.
 * @param p2 - End point.
 * @param t - Curve parameter, normally in `[0, 1]`.
 * @returns The point on the curve at `t`.
 */
export function quadraticBezier2(
	p0: Vec2,
	p1: Vec2,
	p2: Vec2,
	t: number,
): Vec2 {
	const u = 1 - t;
	const basis = [u * u, 2 * u * t, t * t];

	return [
		dotPrecise(basis, [p0[0], p1[0], p2[0]]),
		dotPrecise(basis, [p0[1], p1[1], p2[1]]),
	];
}

/**
 * Evaluates a cubic Bézier curve at parameter `t`:
 *
 * ```text
 * B(t) = (1 − t)³·p0 + 3(1 − t)²t·p1 + 3(1 − t)t²·p2 + t³·p3
 * ```
 *
 * @param p0 - Start point.
 * @param p1 - First control point.
 * @param p2 - Second control point.
 * @param p3 - End point.
 * @param t - Curve parameter, normally in `[0, 1]`.
 * @returns The point on the curve at `t`.
 */
export function cubicBezier2(
	p0: Vec2,
	p1: Vec2,
	p2: Vec2,
	p3: Vec2,
	t: number,
): Vec2 {
	const u = 1 - t;
	const uu = u * u;
	const tt = t * t;
	const basis = [uu * u, 3 * uu * t, 3 * u * tt, tt * t];

	return [
		dotPrecise(basis, [p0[0], p1[0], p2[0], p3[0]]),
		dotPrecise(basis, [p0[1], p1[1], p2[1], p3[1]]),
	];
}
