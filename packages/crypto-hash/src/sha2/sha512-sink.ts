import { SHA512_PARAMS } from "./_sha2-64-params.js";
import { Sha2_64Sink } from "./_sha2-64-sink.js";

/**
 * An incremental SHA-512 hasher — see `Sha2_32Sink`'s module doc for the
 * general `WritableStream<Uint8Array>` pattern shared by every sink in this
 * package.
 */
export class Sha512Sink extends Sha2_64Sink {
	constructor() {
		super(SHA512_PARAMS);
	}
}
