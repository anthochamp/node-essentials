import { MaybePromiseLike } from "@ac-kit/core";

import { sha2_64 } from "./_sha2-64-core.js";
import { SHA384_PARAMS } from "./_sha2-64-params.js";

/** The TS kernel, always available — see the module doc in `index.ts`. */
export function sha384Ts(data: Uint8Array): Uint8Array<ArrayBuffer> {
	return sha2_64(data, SHA384_PARAMS);
}

/**
 * SHA-384 (FIPS 180-4). Prefers the Web Crypto kernel (`crypto.subtle`, real
 * `Promise`) when available; falls back to the TS kernel (synchronous, no
 * `Promise` allocation) otherwise.
 */
export function sha384(
	data: Uint8Array<ArrayBuffer>,
): MaybePromiseLike<Uint8Array<ArrayBuffer>> {
	if (typeof crypto === "undefined" || !crypto.subtle) {
		return sha384Ts(data);
	}

	return crypto.subtle
		.digest("SHA-384", data)
		.then((buffer) => new Uint8Array(buffer));
}
