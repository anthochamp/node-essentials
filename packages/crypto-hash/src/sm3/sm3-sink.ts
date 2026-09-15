import { BlockAccumulator, setUint32ArrayBe } from "@ac-kit/core";

import { merkleDamgardPad } from "../_common/_merkle-damgard-pad.js";
import { SM3_IV, sm3ProcessBlock } from "./_sm3-core.js";

const BLOCK_SIZE_BYTES = 64;

/**
 * An incremental SM3 hasher — see `Sha2_32Sink`'s module doc for the general
 * `WritableStream<Uint8Array>` pattern shared by every sink in this package.
 * Same block-buffering shape as the SHA-2 sinks (`BlockAccumulator` over
 * `sm3ProcessBlock`), only the compression function and combine step differ.
 */
export class Sm3Sink extends WritableStream<Uint8Array> {
	private readonly deferred = Promise.withResolvers<Uint8Array>();

	constructor() {
		const state = Uint32Array.from(SM3_IV);
		let totalBytes = 0n;

		const accumulator = new BlockAccumulator(
			BLOCK_SIZE_BYTES,
			(block, offset) => sm3ProcessBlock(state, block, offset),
		);

		function absorb(chunk: Uint8Array): void {
			totalBytes += BigInt(chunk.length);
			accumulator.absorb(chunk);
		}

		function finalize(): Uint8Array<ArrayBuffer> {
			const padded = merkleDamgardPad(
				accumulator.tail,
				BLOCK_SIZE_BYTES,
				8,
				totalBytes * 8n,
			);

			for (let offset = 0; offset < padded.length; offset += BLOCK_SIZE_BYTES) {
				sm3ProcessBlock(state, padded, offset);
			}

			const digest = new Uint8Array(state.length * 4);
			setUint32ArrayBe(digest, 0, state);
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
