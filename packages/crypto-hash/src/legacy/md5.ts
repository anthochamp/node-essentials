import { setUint32ArrayLe } from "@ac-kit/core";

import { merkleDamgardPadLe } from "../_common/_merkle-damgard-pad.js";
import { MD5_IV, md5ProcessBlock } from "./_md5-core.js";

/**
 * MD5 (RFC 1321) — see `_md5-core.ts`'s module doc for why this is legacy-only.
 *
 * No Web Crypto kernel: `crypto.subtle.digest` never supported MD5 (it was
 * already considered broken by the time Web Crypto was specified); always the
 * TS kernel, plainly synchronous.
 */
export function md5(data: Uint8Array): Uint8Array<ArrayBuffer> {
	const padded = merkleDamgardPadLe(data, 64, 8);
	const state = Uint32Array.from(MD5_IV);

	for (let block = 0; block < padded.length; block += 64) {
		md5ProcessBlock(state, padded, block);
	}

	const digest = new Uint8Array(state.length * 4);
	setUint32ArrayLe(digest, 0, state);
	return digest;
}
