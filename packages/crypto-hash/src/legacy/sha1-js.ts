import { setUint32ArrayBe } from "@ac-kit/core";

import { merkleDamgardPad } from "../_common/_merkle-damgard-pad.js";
import { SHA1_IV, sha1ProcessBlock } from "./_sha1-core.js";

/**
 * SHA-1 (FIPS 180-4) — see `_sha1-core.ts`'s module doc for why this is
 * legacy-only. The TS kernel, always available — see the module doc in
 * `index.ts`.
 */
export function sha1Js(data: Uint8Array): Uint8Array<ArrayBuffer> {
	const padded = merkleDamgardPad(data, 64, 8);
	const state = Uint32Array.from(SHA1_IV);

	for (let block = 0; block < padded.length; block += 64) {
		sha1ProcessBlock(state, padded, block);
	}

	const digest = new Uint8Array(state.length * 4);
	setUint32ArrayBe(digest, 0, state);
	return digest;
}
