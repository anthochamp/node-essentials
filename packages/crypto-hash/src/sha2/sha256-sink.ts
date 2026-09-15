import { SHA256_PARAMS } from "./_sha2-32-params.js";
import { Sha2_32Sink } from "./_sha2-32-sink.js";

/**
 * An incremental SHA-256 hasher — see `Sha2_32Sink`'s module doc for the
 * general `WritableStream<Uint8Array>` pattern shared by every sink in this
 * package.
 */
export class Sha256Sink extends Sha2_32Sink {
	constructor() {
		super(SHA256_PARAMS);
	}
}
