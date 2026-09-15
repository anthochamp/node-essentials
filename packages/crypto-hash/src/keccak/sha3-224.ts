import { SHA3_224_PARAMS } from "./_keccak-params.js";
import { keccakSponge } from "./_keccak-sponge.js";

/**
 * SHA3-224 (FIPS 202). No Web Crypto kernel: Node exposes SHA3-256/384/512 as
 * an explicitly experimental, non-standard extension (confirmed empirically;
 * SHA3-224 itself isn't even in that set), and it isn't part of the Web Crypto
 * specification at all — no browser implements it. Always the TS kernel,
 * plainly synchronous.
 */
export function sha3_224(data: Uint8Array): Uint8Array {
	return keccakSponge(data, SHA3_224_PARAMS, 28);
}
