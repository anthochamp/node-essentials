import { sha2_32 } from "./_sha2-32-core.js";
import { SHA224_PARAMS } from "./_sha2-32-params.js";

/**
 * SHA-224 (FIPS 180-4). No Web Crypto kernel: `crypto.subtle.digest` does not
 * recognise `"SHA-224"` in any current engine, so this is always the TS kernel
 * — plainly synchronous, not `MaybePromiseLike<T>`, since there is no second
 * kernel to unify against.
 */
export function sha224(data: Uint8Array): Uint8Array {
	return sha2_32(data, SHA224_PARAMS);
}
