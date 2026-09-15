/**
 * Shared MSB-first GF(2) polynomial-division primitives, underlying both
 * `checksum/_crc-engine.ts`'s non-reflected CRC algorithm and
 * `rolling/rabin-fingerprint.ts`. Operates on `bigint` so a single
 * implementation covers every register width; callers with a width that fits in
 * `number` (CRC's ≤32-bit registers) convert once per table build, not per
 * byte, so the per-byte hot loop stays on `number` arithmetic where it already
 * was.
 */

/**
 * Builds a 256-entry table for one step of MSB-first GF(2) polynomial division:
 * `table[byte]` is the register update contributed by shifting `byte` in at the
 * top of an all-zero register.
 *
 * Complexity: O(256 * width).
 *
 * @param polynomial - The generating polynomial, MSB-first, top bit omitted.
 * @param width - Register width in bits (>= 8).
 */
export function buildGf2PolynomialTable(
	polynomial: bigint,
	width: number,
): BigUint64Array {
	const widthBig = BigInt(width);
	const mask = (1n << widthBig) - 1n;
	const topBit = 1n << (widthBig - 1n);
	const shift = widthBig - 8n;
	const table = new BigUint64Array(256);

	for (let byte = 0; byte < 256; byte++) {
		let register = BigInt(byte) << shift;

		for (let bit = 0; bit < 8; bit++) {
			const shiftedOutOne = (register & topBit) !== 0n;

			register = (register << 1n) & mask;

			if (shiftedOutOne) {
				register ^= polynomial;
			}
		}

		table[byte] = register;
	}

	return table;
}

/**
 * Advances an MSB-first GF(2) polynomial-division register by one byte, using a
 * table from {@link buildGf2PolynomialTable}.
 *
 * Complexity: O(1).
 *
 * @param register - The register's current value, already masked to `width`
 *   bits.
 * @param byteIn - The next byte, consumed most-significant-bit first.
 * @param table - A table built by {@link buildGf2PolynomialTable} for the same
 *   `polynomial`/`width`.
 * @param width - Register width in bits (>= 8), matching the table's.
 */
export function stepGf2Polynomial(
	register: bigint,
	byteIn: number,
	table: BigUint64Array,
	width: number,
): bigint {
	const widthBig = BigInt(width);
	const mask = (1n << widthBig) - 1n;
	const shift = widthBig - 8n;
	const index = (Number(register >> shift) ^ byteIn) & 0xff;
	const shifted = (register << 8n) & mask;

	return shifted ^ table[index]!;
}

/**
 * Multiplies two GF(2) polynomials and reduces the product modulo `polynomial`,
 * all represented as `bigint` bit-vectors of up to `width` bits.
 *
 * Complexity: O(width).
 *
 * @param a - First factor, already masked to `width` bits.
 * @param b - Second factor, already masked to `width` bits.
 * @param polynomial - The modulus, MSB-first, top bit omitted.
 * @param width - Register width in bits (>= 1).
 */
export function gf2MulMod(
	a: bigint,
	b: bigint,
	polynomial: bigint,
	width: number,
): bigint {
	const widthBig = BigInt(width);
	const mask = (1n << widthBig) - 1n;
	const topBit = 1n << (widthBig - 1n);
	let product = 0n;
	let multiplicand = a;
	let multiplier = b;

	for (let i = 0; i < width; i++) {
		if ((multiplier & 1n) !== 0n) {
			product ^= multiplicand;
		}

		multiplier >>= 1n;

		const carry = (multiplicand & topBit) !== 0n;

		multiplicand = (multiplicand << 1n) & mask;

		if (carry) {
			multiplicand ^= polynomial;
		}
	}

	return product;
}

/**
 * Computes `base^exponent mod polynomial` over GF(2), via repeated squaring.
 *
 * Complexity: O(width * log2(exponent)).
 *
 * @param base - The base, already masked to `width` bits.
 * @param exponent - A non-negative exponent.
 * @param polynomial - The modulus, MSB-first, top bit omitted.
 * @param width - Register width in bits (>= 1).
 */
export function gf2ModPow(
	base: bigint,
	exponent: bigint,
	polynomial: bigint,
	width: number,
): bigint {
	const mask = (1n << BigInt(width)) - 1n;
	let result = 1n;
	let squared = base & mask;
	let remainingExponent = exponent;

	while (remainingExponent > 0n) {
		if ((remainingExponent & 1n) !== 0n) {
			result = gf2MulMod(result, squared, polynomial, width);
		}

		squared = gf2MulMod(squared, squared, polynomial, width);
		remainingExponent >>= 1n;
	}

	return result;
}
