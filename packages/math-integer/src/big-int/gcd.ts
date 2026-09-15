import { bigIntAbs } from "@ac-kit/core";

/**
 * Greatest common divisor, by the binary (Stein) algorithm.
 *
 * Always non-negative; `bigIntGcd(0n, 0n)` is `0n`. Stein's algorithm avoids
 * division entirely, using only subtraction and shifts, which `bigint`
 * implements more cheaply than `%` at large widths.
 */
export function bigIntGcd(a: bigint, b: bigint): bigint {
	let x = bigIntAbs(a);
	let y = bigIntAbs(b);

	if (x === 0n) {
		return y;
	}

	if (y === 0n) {
		return x;
	}

	// Factor out the common powers of two, then keep both operands odd.
	let commonTwos = 0n;

	while ((x & 1n) === 0n && (y & 1n) === 0n) {
		x >>= 1n;
		y >>= 1n;
		commonTwos++;
	}

	while ((x & 1n) === 0n) {
		x >>= 1n;
	}

	while (y !== 0n) {
		while ((y & 1n) === 0n) {
			y >>= 1n;
		}

		if (x > y) {
			[x, y] = [y, x];
		}

		y -= x;
	}

	return x << commonTwos;
}
