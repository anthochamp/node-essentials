import { MaybePromiseLike } from "@ac-kit/core";

import { sha1Js } from "./sha1-js.js";

/**
 * SHA-1. Prefers the Web Crypto kernel (`crypto.subtle`, real `Promise`) when
 * available; falls back to the TS kernel (synchronous, no `Promise` allocation)
 * otherwise — same dual-kernel shape as `sha256`. Web Crypto keeps `"SHA-1"` as
 * a valid `digest()` algorithm specifically for legacy interop (verified
 * empirically against Node's implementation), even though SHA-1 itself is
 * broken — see `_sha1-core.ts`'s module doc.
 */
export function sha1(
	data: Uint8Array<ArrayBuffer>,
): MaybePromiseLike<Uint8Array<ArrayBuffer>> {
	if (typeof crypto === "undefined" || !crypto.subtle) {
		return sha1Js(data);
	}

	return crypto.subtle
		.digest("SHA-1", data)
		.then((buffer) => new Uint8Array(buffer));
}
