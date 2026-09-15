import { SHAKE128_PARAMS } from "./_keccak-params.js";
import { keccakSponge } from "./_keccak-sponge.js";

/**
 * SHAKE128 (FIPS 202) — an extendable-output function (XOF): `outputBytes`
 * chooses the output length freely, rather than it being fixed by the algorithm
 * the way SHA3-*'s is.
 *
 * No Web Crypto kernel: no engine implements SHAKE at all (confirmed
 * empirically — Node's experimental SHA-3 support stops at the fixed-output
 * members).
 *
 * @throws {RangeError} When `outputBytes` is not a non-negative integer.
 */
export function shake128(data: Uint8Array, outputBytes: number): Uint8Array {
	if (!Number.isInteger(outputBytes) || outputBytes < 0) {
		throw new RangeError(
			"shake128: outputBytes must be a non-negative integer",
		);
	}

	return keccakSponge(data, SHAKE128_PARAMS, outputBytes);
}
