import { SHAKE256_PARAMS } from "./_keccak-params.js";
import { KeccakSink } from "./_keccak-sink.js";

/**
 * An incremental SHAKE256 hasher — see `Sha2_32Sink`'s module doc for the
 * general pattern and `_keccak-sink.ts` for the sponge-specific absorb/
 * finalize logic every SHA-3/SHAKE sink shares. See `shake128-sink.ts`'s module
 * doc for the output-length parameter.
 *
 * @throws {RangeError} When `outputBytes` is not a non-negative integer.
 */
export class Shake256Sink extends KeccakSink {
	constructor(outputBytes: number) {
		if (!Number.isInteger(outputBytes) || outputBytes < 0) {
			throw new RangeError(
				"Shake256Sink: outputBytes must be a non-negative integer",
			);
		}

		super(SHAKE256_PARAMS, outputBytes);
	}
}
