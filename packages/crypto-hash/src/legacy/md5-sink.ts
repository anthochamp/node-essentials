import { BlockAccumulator, setUint32ArrayLe } from "@ac-kit/core";

import { merkleDamgardPadLe } from "../_common/_merkle-damgard-pad.js";
import { MD5_IV, md5ProcessBlock } from "./_md5-core.js";

const BLOCK_SIZE_BYTES = 64;

/**
 * An incremental MD5 hasher — see `Sha2_32Sink`'s module doc for the general
 * `WritableStream<Uint8Array>` pattern shared by every sink in this package,
 * and `_md5-core.ts`'s module doc for why this is legacy-only.
 */
export class Md5Sink extends WritableStream<Uint8Array> {
	private readonly deferred = Promise.withResolvers<Uint8Array>();

	constructor() {
		const state = Uint32Array.from(MD5_IV);
		let totalBytes = 0n;

		const accumulator = new BlockAccumulator(
			BLOCK_SIZE_BYTES,
			(block, offset) => md5ProcessBlock(state, block, offset),
		);

		function absorb(chunk: Uint8Array): void {
			totalBytes += BigInt(chunk.length);
			accumulator.absorb(chunk);
		}

		function finalize(): Uint8Array<ArrayBuffer> {
			const padded = merkleDamgardPadLe(
				accumulator.tail,
				BLOCK_SIZE_BYTES,
				8,
				totalBytes * 8n,
			);

			for (let offset = 0; offset < padded.length; offset += BLOCK_SIZE_BYTES) {
				md5ProcessBlock(state, padded, offset);
			}

			const digest = new Uint8Array(state.length * 4);
			setUint32ArrayLe(digest, 0, state);
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
