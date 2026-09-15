import { SHA3_512_PARAMS } from "./_keccak-params.js";
import { keccakSponge } from "./_keccak-sponge.js";

/**
 * SHA3-512 (FIPS 202). No Web Crypto kernel — see the module doc in
 * `sha3-256.ts` for why the family stays TS-only despite Node's experimental
 * `crypto.subtle.digest("SHA3-512", ...)`.
 */
export function sha3_512(data: Uint8Array): Uint8Array {
	return keccakSponge(data, SHA3_512_PARAMS, 64);
}
