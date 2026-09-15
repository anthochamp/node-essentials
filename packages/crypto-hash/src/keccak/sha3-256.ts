import { SHA3_256_PARAMS } from "./_keccak-params.js";
import { keccakSponge } from "./_keccak-sponge.js";

/**
 * SHA3-256 (FIPS 202).
 *
 * Node exposes `crypto.subtle.digest("SHA3-256", ...)`, but flags it explicitly
 * experimental at runtime ("might change at any time") and it is not part of
 * the Web Crypto specification — no browser implements it, and neither SHA3-224
 * nor SHAKE128/256 are exposed alongside it even in Node. Depending on it here
 * would make one member of the SHA-3 family behave differently from its
 * siblings for no real portability gain, so this stays TS-only like the rest of
 * `crypto/hash`'s SHA-3/SHAKE members — unlike `sha256`/`sha384`/`sha512`,
 * which use a real, standardized Web Crypto kernel.
 */
export function sha3_256(data: Uint8Array): Uint8Array {
	return keccakSponge(data, SHA3_256_PARAMS, 32);
}
