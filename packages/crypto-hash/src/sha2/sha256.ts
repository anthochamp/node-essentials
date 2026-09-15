import { MaybePromiseLike } from "@ac-kit/core";

import { sha2_32 } from "./_sha2-32-core.js";
import { SHA256_PARAMS } from "./_sha2-32-params.js";

/** The TS kernel, always available — see the module doc in `index.ts`. */
export function sha256Ts(data: Uint8Array): Uint8Array<ArrayBuffer> {
	return sha2_32(data, SHA256_PARAMS);
}

/**
 * SHA-256 (FIPS 180-4). Prefers the Web Crypto kernel (`crypto.subtle`, real
 * `Promise`) when available; falls back to the TS kernel (synchronous, no
 * `Promise` allocation) otherwise. The choice is cached after the first call —
 * Web Crypto's availability is an environment property, not a per-call one.
 */
export function sha256(
	data: Uint8Array<ArrayBuffer>,
): MaybePromiseLike<Uint8Array<ArrayBuffer>> {
	if (typeof crypto === "undefined" || !crypto.subtle) {
		return sha256Ts(data);
	}

	return crypto.subtle
		.digest("SHA-256", data)
		.then((buffer) => new Uint8Array(buffer));
}
