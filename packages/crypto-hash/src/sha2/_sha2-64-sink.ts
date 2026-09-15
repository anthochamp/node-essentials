import { BlockAccumulator, setBigUint64ArrayBe } from "@ac-kit/core";

import { merkleDamgardPad } from "../_common/_merkle-damgard-pad.js";
import { sha2_64ProcessBlock } from "./_sha2-64-core.js";
import type { Sha2_64Parameters } from "./_sha2-64-params.js";

const BLOCK_SIZE_BYTES = 128;
const LENGTH_FIELD_BYTES = 16;

/**
 * An incremental 64-bit-word SHA-2 hasher, configured by
 * {@link
 * Sha2_64Parameters} — see `Sha2_32Sink`'s module doc for the general
 * `WritableStream<Uint8Array>` pattern every sink in this package shares. Uses
 * the 64-bit core ({@link sha2_64ProcessBlock}), not the 32-bit one
 * `Sha2_32Sink` builds on.
 */
export class Sha2_64Sink extends WritableStream<Uint8Array> {
	private readonly deferred = Promise.withResolvers<Uint8Array>();

	constructor(params: Sha2_64Parameters) {
		const state = BigUint64Array.from(params.iv);
		let totalBytes = 0n;

		const accumulator = new BlockAccumulator(
			BLOCK_SIZE_BYTES,
			(block, offset) => sha2_64ProcessBlock(state, block, offset),
		);

		function absorb(chunk: Uint8Array): void {
			totalBytes += BigInt(chunk.length);
			accumulator.absorb(chunk);
		}

		function finalize(): Uint8Array<ArrayBuffer> {
			const padded = merkleDamgardPad(
				accumulator.tail,
				BLOCK_SIZE_BYTES,
				LENGTH_FIELD_BYTES,
				totalBytes * 8n,
			);

			for (let offset = 0; offset < padded.length; offset += BLOCK_SIZE_BYTES) {
				sha2_64ProcessBlock(state, padded, offset);
			}

			const digest = new Uint8Array(params.outputBytes);
			setBigUint64ArrayBe(digest, 0, state, params.outputBytes);
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
