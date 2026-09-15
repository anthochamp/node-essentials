import { BlockAccumulator, setUint32ArrayBe } from "@ac-kit/core";

import { merkleDamgardPad } from "../_common/_merkle-damgard-pad.js";
import { sha2_32ProcessBlock } from "./_sha2-32-core.js";
import type { Sha2_32Parameters } from "./_sha2-32-params.js";

const BLOCK_SIZE_BYTES = 64;

/**
 * An incremental 32-bit-word SHA-2 hasher, configured by
 * {@link
 * Sha2_32Parameters}, for data too large to hold in memory at once (a
 * large file, a network stream): `pipeTo`/`pipeThrough` it directly, or write
 * to it via `getWriter()`, then read `digest` once the pipe completes. Every
 * named sink in this package (`Sha224Sink`, `Sha256Sink`, and every
 * SHA-3/SHAKE/SM3 sink alongside it) follows this same shape — itself a
 * `WritableStream<Uint8Array>`, since the Streams Standard is exactly as
 * portable across Node/browsers/Deno/Bun as anything else this package relies
 * on, and its underlying-sink constructor pattern is what subclassing it is
 * for.
 *
 * The one-shot functions (`sha224`, `sha256Ts`, …) are unaffected and unchanged
 * — they stay the direct path for data already in memory, with no stream
 * machinery in between. This is a separate, additional entry point, not a
 * replacement.
 *
 * Always the TS kernel, never Web Crypto: `SubtleCrypto.digest` has no
 * incremental form in the Web Crypto specification at all — only a one-shot
 * `digest(algorithm, data)` taking the whole buffer — so there is no "streaming
 * Web Crypto kernel" to prefer here. Every byte only ever passes through
 * {@link sha2_32ProcessBlock}, the same compression primitive the one-shot
 * functions call; the two paths differ only in how blocks are assembled, not in
 * how they're compressed.
 */
export class Sha2_32Sink extends WritableStream<Uint8Array> {
	private readonly deferred = Promise.withResolvers<Uint8Array>();

	constructor(params: Sha2_32Parameters) {
		const state = Uint32Array.from(params.iv);
		let totalBytes = 0n;

		const accumulator = new BlockAccumulator(
			BLOCK_SIZE_BYTES,
			(block, offset) => sha2_32ProcessBlock(state, block, offset),
		);

		// `this` cannot be touched before `super()` returns, so the state
		// this sink mutates on every write lives as constructor-local closures
		// rather than instance fields, exactly as an underlying sink passed to
		// any `WritableStream` would need to whether this class existed or not.
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
				sha2_32ProcessBlock(state, padded, offset);
			}

			const digest = new Uint8Array(params.outputBytes);
			setUint32ArrayBe(digest, 0, state, params.outputBytes);
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
