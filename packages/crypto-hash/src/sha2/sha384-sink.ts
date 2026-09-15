import { SHA384_PARAMS } from "./_sha2-64-params.js";
import { Sha2_64Sink } from "./_sha2-64-sink.js";

/**
 * An incremental SHA-384 hasher — see `Sha2_32Sink`'s module doc for the
 * general `WritableStream<Uint8Array>` pattern shared by every sink in this
 * package. Differs from {@link Sha512Sink} only in its `Sha2_64Parameters`,
 * exactly as `sha384Ts` differs from `sha512Ts`.
 */
export class Sha384Sink extends Sha2_64Sink {
	constructor() {
		super(SHA384_PARAMS);
	}
}
