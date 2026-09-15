import { MaybePromiseLike } from "@ac-kit/core";
import { sha512Ts } from "@ac-kit/crypto-hash";

import { hmac } from "./hmac-core.js";

const BLOCK_SIZE_BYTES = 128;

/** The TS kernel, always available — see the module doc in `index.ts`. */
export function hmacSha512Ts(
	key: Uint8Array,
	message: Uint8Array,
): Uint8Array<ArrayBuffer> {
	return hmac(sha512Ts, BLOCK_SIZE_BYTES, key, message);
}

/**
 * HMAC-SHA-512 (RFC 2104). Prefers the Web Crypto kernel
 * (`crypto.subtle.importKey` + `.sign`, real `Promise`) when available; falls
 * back to the TS kernel (synchronous, no `Promise` allocation) otherwise — same
 * dual-kernel shape as `sha512` in `@ac-kit/crypto-hash`.
 */
export function hmacSha512(
	key: Uint8Array<ArrayBuffer>,
	message: Uint8Array<ArrayBuffer>,
): MaybePromiseLike<Uint8Array<ArrayBuffer>> {
	if (typeof crypto === "undefined" || !crypto.subtle) {
		return hmacSha512Ts(key, message);
	}

	return crypto.subtle
		.importKey("raw", key, { name: "HMAC", hash: "SHA-512" }, false, ["sign"])
		.then((cryptoKey) => crypto.subtle.sign("HMAC", cryptoKey, message))
		.then((signature) => new Uint8Array(signature));
}
