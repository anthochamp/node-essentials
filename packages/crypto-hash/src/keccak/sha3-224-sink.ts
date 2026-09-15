import { SHA3_224_PARAMS } from "./_keccak-params.js";
import { KeccakSink } from "./_keccak-sink.js";

/**
 * An incremental SHA3-224 hasher — see `Sha2_32Sink`'s module doc for the
 * general pattern and `_keccak-sink.ts` for the sponge-specific absorb/
 * finalize logic every SHA-3/SHAKE sink shares.
 */
export class Sha3_224Sink extends KeccakSink {
	constructor() {
		super(SHA3_224_PARAMS, 28);
	}
}
