/**
 * The MD5 compression function (RFC 1321). Merkle–Damgård, 64-byte blocks, four
 * 32-bit state words, but — unlike every other member of this package — words
 * are read/written **little-endian**, not big-endian.
 *
 * Legacy: MD5 is cryptographically broken (practical collisions are trivial to
 * construct) and must never be used for anything security-sensitive.
 * Implemented only for interop with existing formats that still specify it
 * (checksums, legacy protocols) — never as a new design's default.
 */

import { getUint32Le, rotl32 } from "@ac-kit/core";

/** RFC 1321 §3.3. */
export const MD5_IV = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476] as const;

/**
 * RFC 1321 §3.4's `T[i] = floor(2^32 * abs(sin(i + 1)))`, computed from that
 * recurrence rather than transcribed as 64 magic hex literals — cross-checked
 * against RFC 1321's own listed `T[1]`/`T[2]` (`0xd76aa478`/`0xe8c7b756`)
 * before being trusted.
 */
const MD5_T: readonly number[] = Array.from({ length: 64 }, (_unused, i) =>
	Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32),
);

/** RFC 1321 §3.4 — per-round left-rotate amount, one group of 16 per round. */
const SHIFTS: readonly number[] = [
	7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
	9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
	16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15,
	21,
];

/** RFC 1321 §3.4's four rounds' distinct boolean function. */
function roundFunction(round: number, b: number, c: number, d: number): number {
	if (round < 16) {
		return (b & c) | (~b & d);
	}

	if (round < 32) {
		return (d & b) | (~d & c);
	}

	if (round < 48) {
		return b ^ c ^ d;
	}

	return c ^ (b | ~d);
}

/** RFC 1321 §3.4 — which message word each of the 64 rounds consumes. */
function messageWordIndex(round: number): number {
	if (round < 16) {
		return round;
	}

	if (round < 32) {
		return (5 * round + 1) % 16;
	}

	if (round < 48) {
		return (3 * round + 5) % 16;
	}

	return (7 * round) % 16;
}

/** Compresses one 64-byte block starting at `offset` into `state`, in place. */
export function md5ProcessBlock(
	state: Uint32Array,
	block: Uint8Array,
	offset: number,
): void {
	const m = new Uint32Array(16);

	for (let t = 0; t < 16; t++) {
		m[t] = getUint32Le(block, offset + t * 4);
	}

	let a = state[0]!;
	let b = state[1]!;
	let c = state[2]!;
	let d = state[3]!;

	for (let round = 0; round < 64; round++) {
		const f =
			(roundFunction(round, b, c, d) +
				a +
				MD5_T[round]! +
				m[messageWordIndex(round)]!) >>>
			0;
		const rotated = rotl32(f, SHIFTS[round]!);

		a = d;
		d = c;
		c = b;
		b = (b + rotated) >>> 0;
	}

	state[0] = (state[0]! + a) >>> 0;
	state[1] = (state[1]! + b) >>> 0;
	state[2] = (state[2]! + c) >>> 0;
	state[3] = (state[3]! + d) >>> 0;
}
