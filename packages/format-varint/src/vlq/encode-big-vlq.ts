import {
	CONTINUATION_BIT,
	PAYLOAD_BITS,
	PAYLOAD_MASK_BIG,
	RADIX_BIG,
} from "../_base128.js";

/**
 * Encodes a non-negative `bigint` as a base-128 VLQ — the unbounded counterpart
 * of {@link encodeVlq}.
 *
 * X.660 puts no ceiling on an OID arc and X.690 §8.19.2 none on a
 * subidentifier, so the encoding has a range `number` cannot cover. Reach for
 * this only when a value may exceed `Number.MAX_SAFE_INTEGER`: every ASN.1 tag
 * number and all but pathological arcs fit a `number`, and `bigint` arithmetic
 * is markedly slower.
 *
 * Time complexity: O(log₁₂₈ value).
 *
 * @param value - A non-negative `bigint`.
 * @returns A fresh buffer holding the encoding, never empty.
 * @throws {RangeError} When `value` is negative.
 */
export function encodeBigVlq(value: bigint): Uint8Array<ArrayBuffer> {
	if (value < 0n) {
		throw new RangeError(
			`encodeBigVlq: value must be non-negative, got ${value}`,
		);
	}

	let length = 1;
	for (let remaining = value; remaining >= RADIX_BIG; remaining /= RADIX_BIG) {
		length++;
	}

	const out = new Uint8Array(length);
	let remaining = value;

	// Filled back to front: the least significant group is known first but
	// belongs last, and only the final byte clears the continuation bit.
	for (let index = length - 1; index >= 0; index--) {
		const group = Number(remaining & PAYLOAD_MASK_BIG);
		out[index] = index === length - 1 ? group : group | CONTINUATION_BIT;
		remaining >>= PAYLOAD_BITS;
	}

	return out;
}
