/**
 * Encodes a `bigint` as two's complement, big-endian bytes.
 *
 * What Java's `BigInteger.toByteArray` and Python's `int.to_bytes` produce.
 * Reach for {@link bigIntToBytesLe} when the least significant byte comes
 * first, and for `@ac-kit/math-integer`'s `limb32`/`limb64` families when the
 * digits feed arithmetic rather than a wire: those are little-endian, unsigned,
 * and of fixed width.
 *
 * Time complexity: O(n) in the byte count.
 *
 * @param value - The value to encode. Zero encodes as a single `0x00`.
 * @param byteLength - Fixed output width, sign-extended to fit. Omit for the
 *   minimal encoding.
 * @returns A fresh buffer, never empty.
 * @throws {RangeError} When `byteLength` is too small to hold `value`.
 */
export function bigIntToBytesBe(
	value: bigint,
	byteLength?: number,
): Uint8Array<ArrayBuffer> {
	const minimal = toMinimalBytes(value);

	if (byteLength === undefined) {
		return minimal;
	}

	if (minimal.length > byteLength) {
		throw new RangeError(
			`bigIntToBytesBe: ${value} needs ${minimal.length} bytes, not ${byteLength}`,
		);
	}

	const out = new Uint8Array(byteLength);
	const padding = byteLength - minimal.length;

	// Sign extension, not zero padding: a negative value's high bytes are 0xff.
	out.fill(value < 0n ? 0xff : 0x00, 0, padding);
	out.set(minimal, padding);

	return out;
}

function toMinimalBytes(value: bigint): Uint8Array<ArrayBuffer> {
	if (value === 0n) {
		return new Uint8Array([0x00]);
	}

	const negative = value < 0n;
	// For a negative, encode |value| - 1 and invert: that is two's complement
	// without ever needing to know the final width up front.
	let remaining = negative ? -value - 1n : value;
	const digits: number[] = [];

	while (remaining > 0n) {
		digits.unshift(Number(remaining & 0xffn));
		remaining >>= 8n;
	}

	if (negative) {
		for (let index = 0; index < digits.length; index++) {
			digits[index] = ~digits[index]! & 0xff;
		}

		// A leading byte without its high bit set would read back as positive.
		if (digits.length === 0 || (digits[0]! & 0x80) === 0) {
			digits.unshift(0xff);
		}
	} else if ((digits[0]! & 0x80) !== 0) {
		digits.unshift(0x00);
	}

	return new Uint8Array(digits);
}
