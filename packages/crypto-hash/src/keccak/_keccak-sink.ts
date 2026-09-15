import { BlockAccumulator } from "@ac-kit/core";

import type { KeccakParameters } from "./_keccak-params.js";
import { keccakAbsorbBlock, keccakSqueeze } from "./_keccak-sponge.js";

/**
 * The incremental Keccak sponge — the shared base every SHA-3/SHAKE sink in
 * this package configures with its own {@link KeccakParameters} and output
 * length, exactly as {@link keccakSponge} is the shared one-shot function each
 * `sha3_*`/`shake*` wrapper configures the same way. See `Sha2_32Sink`'s module
 * doc for the general `WritableStream<Uint8Array>` pattern.
 *
 * Absorbing is exactly `BlockAccumulator` over `rateBytes`-sized blocks, same
 * as the Merkle–Damgård sinks — only the per-block operation
 * ({@link keccakAbsorbBlock} vs. `sha2_32ProcessBlock`/`sha2_64ProcessBlock`)
 * and the finalization (pad10_1 + domain suffix vs. a trailing bit-length
 * field) differ. A tail can never reach a full `rateBytes` (`BlockAccumulator`
 * always processes a completed block immediately), so the final, padded block
 * is always exactly one block — never two, unlike the general pad10_1 case.
 */
export class KeccakSink extends WritableStream<Uint8Array> {
	private readonly deferred = Promise.withResolvers<Uint8Array>();

	constructor(params: KeccakParameters, outputBytes: number) {
		const { rateBytes, domainSuffix } = params;
		const state = new BigUint64Array(25);
		const rateWords = rateBytes / 8;

		const accumulator = new BlockAccumulator(rateBytes, (block, offset) =>
			keccakAbsorbBlock(state, block, offset, rateWords),
		);

		function absorb(chunk: Uint8Array): void {
			accumulator.absorb(chunk);
		}

		function finalize(): Uint8Array<ArrayBuffer> {
			const finalBlock = new Uint8Array(rateBytes);

			finalBlock.set(accumulator.tail);
			finalBlock[accumulator.tail.length] = domainSuffix;
			finalBlock[rateBytes - 1] = finalBlock[rateBytes - 1]! ^ 0x80;

			keccakAbsorbBlock(state, finalBlock, 0, rateWords);

			return keccakSqueeze(state, rateBytes, outputBytes);
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
