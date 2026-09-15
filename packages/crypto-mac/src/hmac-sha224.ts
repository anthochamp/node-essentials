import { sha224 } from "@ac-kit/crypto-hash";

import { hmac } from "./hmac-core.js";

const BLOCK_SIZE_BYTES = 64;

/**
 * HMAC-SHA-224 (RFC 2104). No Web Crypto kernel, matching `sha224` itself — no
 * engine recognises the algorithm name.
 */
export function hmacSha224(key: Uint8Array, message: Uint8Array): Uint8Array {
	return hmac(sha224, BLOCK_SIZE_BYTES, key, message);
}
