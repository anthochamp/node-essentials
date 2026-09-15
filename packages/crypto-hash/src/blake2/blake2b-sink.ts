import { BlockAccumulator, setBigUint64ArrayLe } from "@ac-kit/core";

import {
	BLAKE2B_BLOCK_SIZE_BYTES,
	BLAKE2B_IV,
	blake2bCompress,
} from "./_blake2b-core.js";

/**
 * An incremental BLAKE2b hasher, unkeyed — see `Sha2_32Sink`'s module doc for
 * the general `WritableStream<Uint8Array>` pattern shared by every sink in this
 * package.
 *
 * Uses `BlockAccumulator`'s `holdBackFinalBlock` mode: BLAKE2's finalization
 * has no padding marker byte, so the last full block must be held back until
 * it's known not to be the final one — see that class's doc for why.
 *
 * @throws {RangeError} When `outputBytes` is not an integer in `[1, 64]`.
 */
export class Blake2bSink extends WritableStream<Uint8Array> {
	private readonly deferred = Promise.withResolvers<Uint8Array>();

	constructor(outputBytes = 64) {
		if (!Number.isInteger(outputBytes) || outputBytes < 1 || outputBytes > 64) {
			throw new RangeError(
				"Blake2bSink: outputBytes must be an integer between 1 and 64",
			);
		}

		const state = BigUint64Array.from(BLAKE2B_IV);

		state[0] = state[0]! ^ 0x01010000n ^ BigInt(outputBytes);

		let totalBytes = 0n;

		const accumulator = new BlockAccumulator(
			BLAKE2B_BLOCK_SIZE_BYTES,
			(block, offset) => {
				totalBytes += BigInt(BLAKE2B_BLOCK_SIZE_BYTES);
				blake2bCompress(state, block, offset, totalBytes, false);
			},
			true,
		);

		function absorb(chunk: Uint8Array): void {
			accumulator.absorb(chunk);
		}

		function finalize(): Uint8Array<ArrayBuffer> {
			const finalTotal = totalBytes + BigInt(accumulator.tail.length);
			const finalBlock = new Uint8Array(BLAKE2B_BLOCK_SIZE_BYTES);

			finalBlock.set(accumulator.tail);
			blake2bCompress(state, finalBlock, 0, finalTotal, true);

			const digest = new Uint8Array(outputBytes);
			setBigUint64ArrayLe(digest, 0, state, outputBytes);
			return digest;
		}

		super({
			write: absorb,
			close: () => this.deferred.resolve(finalize()),
			abort: (reason) => this.deferred.reject(reason),
		});
	}

	get digest(): Promise<Uint8Array> {
		return this.deferred.promise;
	}
}
