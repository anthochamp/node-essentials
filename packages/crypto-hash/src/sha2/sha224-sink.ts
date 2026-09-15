import { SHA224_PARAMS } from "./_sha2-32-params.js";
import { Sha2_32Sink } from "./_sha2-32-sink.js";

/**
 * An incremental SHA-224 hasher — see `Sha2_32Sink`'s module doc for the
 * general `WritableStream<Uint8Array>` pattern shared by every sink in this
 * package. Differs from {@link Sha256Sink} only in its `Sha2_32Parameters`,
 * exactly as `sha224` differs from `sha256Ts`.
 */
export class Sha224Sink extends Sha2_32Sink {
	constructor() {
		super(SHA224_PARAMS);
	}
}
