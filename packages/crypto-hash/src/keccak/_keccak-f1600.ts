import { rotl64 } from "@ac-kit/core";

/**
 * The Keccak-f[1600] permutation (FIPS 202 §3.3) — the core transformation
 * behind SHA-3 and SHAKE. Operates in place on a 25-lane, 64-bit-per-lane state
 * (1600 bits total), indexed `state[x + 5 * y]` for `x, y` in `0..4`.
 *
 * Round constants and rotation offsets are hardcoded, verified values. FIPS 202
 * defines both via small recurrences — an LFSR-based bit generator for the
 * round constants, a triangular-number recurrence for the rotation offsets —
 * but paying that computation on every call (or even once per process) buys
 * nothing over a literal table; both tables here were computed from those
 * recurrences and cross-checked against the published SHA3-256("") test vector
 * before being committed.
 */

const ROUND_CONSTANTS: readonly bigint[] = [
	0x0000000000000001n,
	0x0000000000008082n,
	0x800000000000808an,
	0x8000000080008000n,
	0x000000000000808bn,
	0x0000000080000001n,
	0x8000000080008081n,
	0x8000000000008009n,
	0x000000000000008an,
	0x0000000000000088n,
	0x0000000080008009n,
	0x000000008000000an,
	0x000000008000808bn,
	0x800000000000008bn,
	0x8000000000008089n,
	0x8000000000008003n,
	0x8000000000008002n,
	0x8000000000000080n,
	0x000000000000800an,
	0x800000008000000an,
	0x8000000080008081n,
	0x8000000000008080n,
	0x0000000080000001n,
	0x8000000080008008n,
];

/** `ROTATION_OFFSETS[x + 5 * y]` — the ρ step's per-lane rotation amount. */
const ROTATION_OFFSETS: readonly bigint[] = [
	0n,
	1n,
	62n,
	28n,
	27n,
	36n,
	44n,
	6n,
	55n,
	20n,
	3n,
	10n,
	43n,
	25n,
	39n,
	41n,
	45n,
	15n,
	21n,
	8n,
	18n,
	2n,
	61n,
	56n,
	14n,
];

/** Runs all 24 rounds of Keccak-f[1600] over `state`, in place. */
export function keccakF1600(state: BigUint64Array): void {
	const c = new BigUint64Array(5);
	const d = new BigUint64Array(5);
	const b = new BigUint64Array(25);

	for (let round = 0; round < 24; round++) {
		// θ (theta): XOR each column's parity into every lane of the two
		// neighboring columns.
		for (let x = 0; x < 5; x++) {
			c[x] =
				state[x]! ^
				state[x + 5]! ^
				state[x + 10]! ^
				state[x + 15]! ^
				state[x + 20]!;
		}

		for (let x = 0; x < 5; x++) {
			d[x] = c[(x + 4) % 5]! ^ rotl64(c[(x + 1) % 5]!, 1n);
		}

		for (let x = 0; x < 5; x++) {
			for (let y = 0; y < 5; y++) {
				state[x + 5 * y] = state[x + 5 * y]! ^ d[x]!;
			}
		}

		// ρ (rho) + π (pi): rotate each lane, then permute lane positions.
		for (let x = 0; x < 5; x++) {
			for (let y = 0; y < 5; y++) {
				const newX = y;
				const newY = (2 * x + 3 * y) % 5;

				b[newX + 5 * newY] = rotl64(
					state[x + 5 * y]!,
					ROTATION_OFFSETS[x + 5 * y]!,
				);
			}
		}

		// χ (chi): a nonlinear, row-local mix — the permutation's only
		// non-affine step.
		for (let x = 0; x < 5; x++) {
			for (let y = 0; y < 5; y++) {
				state[x + 5 * y] =
					b[x + 5 * y]! ^
					(~b[((x + 1) % 5) + 5 * y]! & b[((x + 2) % 5) + 5 * y]!);
			}
		}

		// ι (iota): break the round's symmetry with a per-round constant.
		state[0] = state[0]! ^ ROUND_CONSTANTS[round]!;
	}
}
