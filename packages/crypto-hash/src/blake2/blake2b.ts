import { setBigUint64ArrayLe } from "@ac-kit/core";

import {
	BLAKE2B_BLOCK_SIZE_BYTES,
	BLAKE2B_IV,
	blake2bCompress,
} from "./_blake2b-core.js";

/**
 * BLAKE2b (RFC 7693), unkeyed. `outputBytes` chooses the digest length (1-64),
 * defaulting to 64 (BLAKE2b-512) — the algorithm's own parameter block folds
 * `outputBytes` into the initial state, so this isn't a post-hoc truncation the
 * way SHA-224's is of SHA-256's.
 *
 * No Web Crypto kernel: BLAKE2 isn't part of the Web Crypto specification and
 * no browser implements it; always the TS kernel, plainly synchronous.
 *
 * @throws {RangeError} When `outputBytes` is not an integer in `[1, 64]`.
 */
export function blake2b(
	data: Uint8Array,
	outputBytes = 64,
): Uint8Array<ArrayBuffer> {
	if (!Number.isInteger(outputBytes) || outputBytes < 1 || outputBytes > 64) {
		throw new RangeError(
			"blake2b: outputBytes must be an integer between 1 and 64",
		);
	}

	const state = BigUint64Array.from(BLAKE2B_IV);

	// RFC 7693 §3.3's parameter block p[0]: kk (key length) is always 0 here
	// (unkeyed).
	state[0] = state[0]! ^ 0x01010000n ^ BigInt(outputBytes);

	const blockCount = Math.max(
		1,
		Math.ceil(data.length / BLAKE2B_BLOCK_SIZE_BYTES),
	);

	for (let block = 0; block < blockCount - 1; block++) {
		const offset = block * BLAKE2B_BLOCK_SIZE_BYTES;

		blake2bCompress(
			state,
			data,
			offset,
			BigInt(offset + BLAKE2B_BLOCK_SIZE_BYTES),
			false,
		);
	}

	const lastBlockStart = (blockCount - 1) * BLAKE2B_BLOCK_SIZE_BYTES;
	const finalBlock = new Uint8Array(BLAKE2B_BLOCK_SIZE_BYTES);

	finalBlock.set(data.subarray(lastBlockStart));
	blake2bCompress(state, finalBlock, 0, BigInt(data.length), true);

	const digest = new Uint8Array(outputBytes);
	setBigUint64ArrayLe(digest, 0, state, outputBytes);
	return digest;
}
