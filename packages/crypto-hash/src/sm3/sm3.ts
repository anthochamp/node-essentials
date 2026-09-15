import { setUint32ArrayBe } from "@ac-kit/core";

import { merkleDamgardPad } from "../_common/_merkle-damgard-pad.js";
import { SM3_IV, sm3ProcessBlock } from "./_sm3-core.js";

/**
 * SM3 (GB/T 32905-2016 / GM/T 0004-2012), the Chinese national standard hash
 * function — see `_sm3-core.ts` for the compression function itself. No Web
 * Crypto kernel: SM3 is not part of the Web Crypto specification and no browser
 * implements it; always the TS kernel, plainly synchronous.
 */
export function sm3(data: Uint8Array): Uint8Array<ArrayBuffer> {
	const padded = merkleDamgardPad(data, 64, 8);
	const state = Uint32Array.from(SM3_IV);

	for (let block = 0; block < padded.length; block += 64) {
		sm3ProcessBlock(state, padded, block);
	}

	const digest = new Uint8Array(state.length * 4);
	setUint32ArrayBe(digest, 0, state);
	return digest;
}
