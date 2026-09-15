import { SHA3_384_PARAMS } from "./_keccak-params.js";
import { keccakSponge } from "./_keccak-sponge.js";

/**
 * SHA3-384 (FIPS 202). No Web Crypto kernel — see the module doc in
 * `sha3-256.ts` for why the family stays TS-only despite Node's experimental
 * `crypto.subtle.digest("SHA3-384", ...)`.
 */
export function sha3_384(data: Uint8Array): Uint8Array {
	return keccakSponge(data, SHA3_384_PARAMS, 48);
}
