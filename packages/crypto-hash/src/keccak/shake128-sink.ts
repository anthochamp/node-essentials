import { SHAKE128_PARAMS } from "./_keccak-params.js";
import { KeccakSink } from "./_keccak-sink.js";

/**
 * An incremental SHAKE128 hasher — see `Sha2_32Sink`'s module doc for the
 * general pattern and `_keccak-sink.ts` for the sponge-specific absorb/
 * finalize logic every SHA-3/SHAKE sink shares. As an extendable-output
 * function, `outputBytes` is fixed at construction time rather than being a
 * property of the algorithm — see `shake128.ts`'s one-shot `shake128`.
 *
 * @throws {RangeError} When `outputBytes` is not a non-negative integer.
 */
export class Shake128Sink extends KeccakSink {
	constructor(outputBytes: number) {
		if (!Number.isInteger(outputBytes) || outputBytes < 0) {
			throw new RangeError(
				"Shake128Sink: outputBytes must be a non-negative integer",
			);
		}

		super(SHAKE128_PARAMS, outputBytes);
	}
}
