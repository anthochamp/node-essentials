import { setUint32ArrayLe } from "@ac-kit/core";

import {
	BLAKE2S_BLOCK_SIZE_BYTES,
	BLAKE2S_IV,
	blake2sCompress,
} from "./_blake2s-core.js";

/**
 * BLAKE2s (RFC 7693), unkeyed. `outputBytes` chooses the digest length (1-32),
 * defaulting to 32 (BLAKE2s-256) — see `blake2b`'s module doc for why this
 * isn't a post-hoc truncation.
 *
 * No Web Crypto kernel — see `blake2b`'s module doc.
 *
 * @throws {RangeError} When `outputBytes` is not an integer in `[1, 32]`.
 */
export function blake2s(
	data: Uint8Array,
	outputBytes = 32,
): Uint8Array<ArrayBuffer> {
	if (!Number.isInteger(outputBytes) || outputBytes < 1 || outputBytes > 32) {
		throw new RangeError(
			"blake2s: outputBytes must be an integer between 1 and 32",
		);
	}

	const state = Uint32Array.from(BLAKE2S_IV);

	state[0] = (state[0]! ^ 0x01010000 ^ outputBytes) >>> 0;

	const blockCount = Math.max(
		1,
		Math.ceil(data.length / BLAKE2S_BLOCK_SIZE_BYTES),
	);

	for (let block = 0; block < blockCount - 1; block++) {
		const offset = block * BLAKE2S_BLOCK_SIZE_BYTES;

		blake2sCompress(
			state,
			data,
			offset,
			BigInt(offset + BLAKE2S_BLOCK_SIZE_BYTES),
			false,
		);
	}

	const lastBlockStart = (blockCount - 1) * BLAKE2S_BLOCK_SIZE_BYTES;
	const finalBlock = new Uint8Array(BLAKE2S_BLOCK_SIZE_BYTES);

	finalBlock.set(data.subarray(lastBlockStart));
	blake2sCompress(state, finalBlock, 0, BigInt(data.length), true);

	const digest = new Uint8Array(outputBytes);
	setUint32ArrayLe(digest, 0, state, outputBytes);
	return digest;
}
