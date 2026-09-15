import { SHAKE256_PARAMS } from "./_keccak-params.js";
import { keccakSponge } from "./_keccak-sponge.js";

/**
 * SHAKE256 (FIPS 202) — an extendable-output function (XOF). See the module doc
 * in `shake128.ts` for the output-length parameter and Web Crypto note.
 *
 * @throws {RangeError} When `outputBytes` is not a non-negative integer.
 */
export function shake256(data: Uint8Array, outputBytes: number): Uint8Array {
	if (!Number.isInteger(outputBytes) || outputBytes < 0) {
		throw new RangeError(
			"shake256: outputBytes must be a non-negative integer",
		);
	}

	return keccakSponge(data, SHAKE256_PARAMS, outputBytes);
}
