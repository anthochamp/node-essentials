import { bigIntModPow } from "./mod-pow.js";

/**
 * Deterministic Miller–Rabin primality test. Witnesses cover every `bigint` up
 * to 3.3 × 10²⁴; beyond that this is a strong probable-prime test rather than a
 * proof.
 *
 * @param value - Must be non-negative; primality of a negative number is
 *   undefined.
 */
export function bigIntIsPrime(value: bigint): boolean {
	if (value < 2n) {
		return false;
	}

	if (value < 4n) {
		return true;
	}

	if (value % 2n === 0n) {
		return false;
	}

	if (value % 3n === 0n) {
		return value === 3n;
	}

	let d = value - 1n;
	let r = 0;

	while (d % 2n === 0n) {
		d /= 2n;
		r++;
	}

	const witnesses = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];

	witness: for (const witness of witnesses) {
		if (witness >= value) {
			continue;
		}

		let x = bigIntModPow(witness, d, value);

		if (x === 1n || x === value - 1n) {
			continue;
		}

		for (let round = 0; round < r - 1; round++) {
			x = (x * x) % value;

			if (x === value - 1n) {
				continue witness;
			}
		}

		return false;
	}

	return true;
}
