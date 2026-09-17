import {
	bigIntBitLength,
	bigIntFromBytesBe,
	bigIntToBytesBe,
	bytesForBits,
} from "@ac-kit/core";
import {
	fixedSIntBigToUnsigned,
	fixedUIntBigIsInRange,
	fixedUIntBigMax,
	fixedUIntBigNot,
	fixedUIntBigToSigned,
} from "@ac-kit/math-numbers";

const BITS_PER_BYTE = 8;

/**
 * A fixed-width bit string — the one representation IPv4, IPv6 and
 * EUI-48/EUI-64 all share.
 *
 * `bitWidth` is **carried, never derived**. Every constructor takes a width the
 * value itself cannot supply: `0x7f000001n` is a 32-bit IPv4 address and also a
 * 128-bit IPv6 address, and a width read back from a value's significant bits
 * would call it 31.
 *
 * `value` is unsigned, because an address has no sign bit: `255.255.255.255` is
 * `4294967295n`, never `-1n`.
 */
export type BitAddress = {
	/** Unsigned, and no wider than `bitWidth` bits. */
	readonly value: bigint;

	/** A positive multiple of 8. */
	readonly bitWidth: number;
};

function assertBitWidth(bitWidth: number): void {
	if (
		!Number.isInteger(bitWidth) ||
		bitWidth <= 0 ||
		bitWidth % BITS_PER_BYTE !== 0
	) {
		throw new RangeError(
			`bit width must be a positive multiple of 8, got ${bitWidth}`,
		);
	}
}

/**
 * Builds an address from octets, most significant first.
 *
 * One of the two wire-form boundaries, with {@link bitAddressToBytes}. Every
 * operation in between works on the value, so a parser converts once on the way
 * in rather than per octet.
 *
 * @param bytes The octets, most significant first.
 * @param bitWidth The width in bits; must be `bytes.length * 8`.
 * @throws RangeError When `bitWidth` is not a positive multiple of 8, or does
 *   not match `bytes.length`.
 */
export function bitAddressFromBytes(
	bytes: Uint8Array,
	bitWidth: number,
): BitAddress {
	assertBitWidth(bitWidth);

	if (bytes.length !== bytesForBits(bitWidth)) {
		throw new RangeError(
			`${bitWidth} bits need ${bytesForBits(bitWidth)} octets, got ${bytes.length}`,
		);
	}

	// `bigIntFromBytesBe` reads the octets as two's complement; reinterpreting
	// the same bit pattern unsigned is what an address means by them.
	return {
		value: fixedSIntBigToUnsigned(bigIntFromBytesBe(bytes), bitWidth),
		bitWidth,
	};
}

/**
 * The octets of the address, most significant first, zero-padded on the left to
 * exactly `bitWidth / 8`.
 *
 * O(bitWidth / 8), and it allocates a fresh array each call — reach for
 * {@link bitAddressBitAt} instead when only one bit is wanted.
 */
export function bitAddressToBytes(
	address: BitAddress,
): Uint8Array<ArrayBuffer> {
	// The signed reinterpretation is what fits the pattern in exactly
	// `bitWidth / 8` octets; the unsigned value would need a leading zero.
	return bigIntToBytesBe(
		fixedUIntBigToSigned(address.value, address.bitWidth),
		bytesForBits(address.bitWidth),
	);
}

/**
 * Throws unless both addresses are the same width.
 *
 * @throws RangeError When the widths differ.
 */
export function assertSameBitWidth(a: BitAddress, b: BitAddress): void {
	if (a.bitWidth !== b.bitWidth) {
		throw new RangeError(
			`address widths differ: ${a.bitWidth} and ${b.bitWidth}`,
		);
	}
}

/**
 * Throws unless the address has exactly `bitWidth` bits.
 *
 * @throws RangeError When it does not.
 */
export function assertBitAddressWidth(
	address: BitAddress,
	bitWidth: number,
): void {
	if (address.bitWidth !== bitWidth) {
		throw new RangeError(
			`expected a ${bitWidth}-bit address, got ${address.bitWidth} bits`,
		);
	}
}

/**
 * The unsigned big-endian value of the whole address. O(1).
 *
 * Unsigned, deliberately: `@ac-kit/core`'s `bigIntFromBytesBe` reads the same
 * octets as two's complement, so it answers `-1n` for `255.255.255.255` where
 * an address means 4294967295. An address is a bit string with no sign bit, and
 * the two encodings are not interchangeable.
 */
export function bitAddressToBigInt(address: BitAddress): bigint {
	return address.value;
}

/**
 * The inverse of {@link bitAddressToBigInt}.
 *
 * @throws RangeError When `value` is negative or does not fit in `bitWidth`
 *   bits.
 */
export function bitAddressFromBigInt(
	value: bigint,
	bitWidth: number,
): BitAddress {
	assertBitWidth(bitWidth);

	if (!fixedUIntBigIsInRange(value, bitWidth)) {
		throw new RangeError(`${value} does not fit in ${bitWidth} bits`);
	}

	return { value, bitWidth };
}

/**
 * The bit at `bitIndex`, counted from the most significant bit.
 *
 * @throws RangeError When `bitIndex` is outside the address.
 */
export function bitAddressBitAt(address: BitAddress, bitIndex: number): 0 | 1 {
	if (
		!Number.isInteger(bitIndex) ||
		bitIndex < 0 ||
		bitIndex >= address.bitWidth
	) {
		throw new RangeError(
			`bit ${bitIndex} is outside a ${address.bitWidth}-bit address`,
		);
	}

	return Number(
		(address.value >> BigInt(address.bitWidth - 1 - bitIndex)) & 1n,
	) as 0 | 1;
}

/** Whether every bit is zero. */
export function bitAddressIsZero(address: BitAddress): boolean {
	return address.value === 0n;
}

/** Whether every bit is one. */
export function bitAddressIsAllOnes(address: BitAddress): boolean {
	return address.value === fixedUIntBigMax(address.bitWidth);
}

/**
 * Adds a signed offset. The address space does not wrap.
 *
 * @throws RangeError When the result leaves the address space.
 */
export function bitAddressAdd(address: BitAddress, delta: bigint): BitAddress {
	return bitAddressFromBigInt(address.value + delta, address.bitWidth);
}

/**
 * Bitwise AND of two same-width addresses.
 *
 * @throws RangeError When the widths differ.
 */
export function bitAddressAnd(a: BitAddress, b: BitAddress): BitAddress {
	assertSameBitWidth(a, b);

	return { value: a.value & b.value, bitWidth: a.bitWidth };
}

/**
 * Bitwise OR of two same-width addresses.
 *
 * @throws RangeError When the widths differ.
 */
export function bitAddressOr(a: BitAddress, b: BitAddress): BitAddress {
	assertSameBitWidth(a, b);

	return { value: a.value | b.value, bitWidth: a.bitWidth };
}

/**
 * Bitwise XOR of two same-width addresses.
 *
 * @throws RangeError When the widths differ.
 */
export function bitAddressXor(a: BitAddress, b: BitAddress): BitAddress {
	assertSameBitWidth(a, b);

	return { value: a.value ^ b.value, bitWidth: a.bitWidth };
}

/** Bitwise complement. */
export function bitAddressNot(address: BitAddress): BitAddress {
	return {
		value: fixedUIntBigNot(address.value, address.bitWidth),
		bitWidth: address.bitWidth,
	};
}

/**
 * How many leading bits `a` and `b` share. O(1).
 *
 * @throws RangeError When the widths differ.
 */
export function bitAddressCommonPrefixLength(
	a: BitAddress,
	b: BitAddress,
): number {
	assertSameBitWidth(a, b);

	// The highest set bit of the difference is the first position they disagree
	// on, so everything above it is shared.
	return a.bitWidth - bigIntBitLength(a.value ^ b.value);
}
