import { setUint32ArrayLe } from "@ac-kit/core";

import { merkleDamgardPadLe } from "../_common/_merkle-damgard-pad.js";
import { RIPEMD160_IV, ripemd160ProcessBlock } from "./_ripemd160-core.js";

/**
 * RIPEMD-160 — see `_ripemd160-core.ts`'s module doc for why this is
 * legacy-only.
 *
 * No Web Crypto kernel: RIPEMD-160 is not part of the Web Crypto specification
 * and no browser implements it; always the TS kernel, plainly synchronous.
 */
export function ripemd160(data: Uint8Array): Uint8Array<ArrayBuffer> {
	const padded = merkleDamgardPadLe(data, 64, 8);
	const state = Uint32Array.from(RIPEMD160_IV);

	for (let block = 0; block < padded.length; block += 64) {
		ripemd160ProcessBlock(state, padded, block);
	}

	const digest = new Uint8Array(state.length * 4);
	setUint32ArrayLe(digest, 0, state);
	return digest;
}
