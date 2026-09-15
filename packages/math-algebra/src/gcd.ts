import type { EuclideanDomain } from "./evidence.js";

/**
 * Greatest common divisor in an arbitrary Euclidean domain, computed by the
 * Euclidean algorithm: `gcd(a, b) = gcd(b, a mod b)` until the remainder is
 * zero.
 *
 * The result is a generator of the ideal `(a) + (b)`; it is unique only up to
 * multiplication by a unit of the domain.
 *
 * @template T - The carrier set of the domain.
 * @param a - First operand.
 * @param b - Second operand.
 * @param domain - Evidence that `T` admits division with remainder.
 * @returns A greatest common divisor of `a` and `b`.
 */
export function gcd<T>(a: T, b: T, domain: EuclideanDomain<T>): T {
	let left = a;
	let right = b;
	while (!domain.eq(right, domain.zero)) {
		const next = domain.divmod(left, right).remainder;
		left = right;
		right = next;
	}
	return left;
}

/**
 * Bézout coefficients alongside the greatest common divisor, satisfying `a · x
 * + b · y = g`.
 *
 * @template T - The carrier set of the domain.
 */
export type BezoutIdentity<T> = {
	readonly gcd: T;
	readonly x: T;
	readonly y: T;
};

/**
 * Extended Euclidean algorithm — computes `gcd(a, b)` together with the Bézout
 * coefficients `x` and `y` such that `a · x + b · y = gcd(a, b)`.
 *
 * @template T - The carrier set of the domain.
 * @param a - First operand.
 * @param b - Second operand.
 * @param domain - Evidence that `T` admits division with remainder.
 * @returns The GCD and its Bézout coefficients.
 */
export function extendedGcd<T>(
	a: T,
	b: T,
	domain: EuclideanDomain<T>,
): BezoutIdentity<T> {
	let oldR = a;
	let r = b;
	let oldX = domain.one;
	let x = domain.zero;
	let oldY = domain.zero;
	let y = domain.one;

	while (!domain.eq(r, domain.zero)) {
		const { quotient, remainder } = domain.divmod(oldR, r);
		oldR = r;
		r = remainder;

		const nextX = domain.sub(oldX, domain.mul(quotient, x));
		oldX = x;
		x = nextX;

		const nextY = domain.sub(oldY, domain.mul(quotient, y));
		oldY = y;
		y = nextY;
	}

	return { gcd: oldR, x: oldX, y: oldY };
}
