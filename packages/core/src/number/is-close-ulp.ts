import { ulpDistance } from "./ulp-distance.js";

/**
 * Tests whether two numbers are within `maxUlps` representable steps of each
 * other.
 *
 * A test about float _representation_, not about a domain quantity: use it for
 * round-trip checks, codec conformance and kernel validation. It cannot express
 * "close to zero" — every normal number is astronomically many ULPs from `0`,
 * so only `±0` and the first few subnormals ever pass. Reach for
 * {@link isCloseTo} whenever the tolerance means something in the caller's
 * units.
 *
 * Slower than the other forms, since the ULP distance needs `BigInt`.
 *
 * @param a - The first number to compare.
 * @param b - The second number to compare.
 * @param maxUlps - The maximum number of ULPs that the two numbers can differ
 *   by to be considered close. Defaults to 4.
 * @returns `true` if the numbers are close within the specified ULPs, `false`
 *   otherwise. `NaN` is never close to anything, including itself.
 */
export function isCloseUlp(a: number, b: number, maxUlps: number = 4): boolean {
	return ulpDistance(a, b) <= maxUlps;
}
