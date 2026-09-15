import { md5 } from "@ac-kit/crypto-hash";

import { hmac } from "./hmac-core.js";

const BLOCK_SIZE_BYTES = 64;

/**
 * HMAC-MD5 (RFC 2104), legacy — needed only for interop, never a new design's
 * default; see `@ac-kit/crypto-hash`'s `md5` for the same caveat one level
 * down. No Web Crypto kernel, matching `md5` itself.
 */
export function hmacMd5(key: Uint8Array, message: Uint8Array): Uint8Array {
	return hmac(md5, BLOCK_SIZE_BYTES, key, message);
}
