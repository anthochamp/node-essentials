/**
 * `base^exponent mod modulus`, by square-and-multiply — never materialises
 * `base^exponent` itself.
 */
export function bigIntModPow(
	base: bigint,
	exponent: bigint,
	modulus: bigint,
): bigint {
	let result = 1n;
	let reducedBase = base % modulus;
	let remainingExponent = exponent;

	while (remainingExponent > 0n) {
		if (remainingExponent & 1n) {
			result = (result * reducedBase) % modulus;
		}

		remainingExponent >>= 1n;
		reducedBase = (reducedBase * reducedBase) % modulus;
	}

	return result;
}
