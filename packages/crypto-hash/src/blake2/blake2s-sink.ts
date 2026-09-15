import { BlockAccumulator, setUint32ArrayLe } from "@ac-kit/core";

import {
	BLAKE2S_BLOCK_SIZE_BYTES,
	BLAKE2S_IV,
	blake2sCompress,
} from "./_blake2s-core.js";

/**
 * An incremental BLAKE2s hasher, unkeyed — see `Sha2_32Sink`'s module doc for
 * the general `WritableStream<Uint8Array>` pattern shared by every sink in this
 * package, and `Blake2bSink`'s module doc for why `BlockAccumulator`'s
 * `holdBackFinalBlock` mode backs it.
 *
 * @throws {RangeError} When `outputBytes` is not an integer in `[1, 32]`.
 */
export class Blake2sSink extends WritableStream<Uint8Array> {
	private readonly deferred = Promise.withResolvers<Uint8Array>();

	constructor(outputBytes = 32) {
		if (!Number.isInteger(outputBytes) || outputBytes < 1 || outputBytes > 32) {
			throw new RangeError(
				"Blake2sSink: outputBytes must be an integer between 1 and 32",
			);
		}

		const state = Uint32Array.from(BLAKE2S_IV);

		state[0] = (state[0]! ^ 0x01010000 ^ outputBytes) >>> 0;

		let totalBytes = 0n;

		const accumulator = new BlockAccumulator(
			BLAKE2S_BLOCK_SIZE_BYTES,
			(block, offset) => {
				totalBytes += BigInt(BLAKE2S_BLOCK_SIZE_BYTES);
				blake2sCompress(state, block, offset, totalBytes, false);
			},
			true,
		);

		function absorb(chunk: Uint8Array): void {
			accumulator.absorb(chunk);
		}

		function finalize(): Uint8Array<ArrayBuffer> {
			const finalTotal = totalBytes + BigInt(accumulator.tail.length);
			const finalBlock = new Uint8Array(BLAKE2S_BLOCK_SIZE_BYTES);

			finalBlock.set(accumulator.tail);
			blake2sCompress(state, finalBlock, 0, finalTotal, true);

			const digest = new Uint8Array(outputBytes);
			setUint32ArrayLe(digest, 0, state, outputBytes);
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
