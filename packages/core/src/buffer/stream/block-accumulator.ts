/**
 * Buffers arbitrary-length writes into fixed-size blocks, invoking
 * `processBlock` once per full block, and carrying any sub-block remainder
 * across calls.
 *
 * The general shape behind any incremental, block-oriented consumer of a byte
 * stream (block ciphers, block-based hash functions, framed protocols, …):
 * accumulate the previous remainder plus the new chunk, process every full
 * block that yields, and keep whatever is left over for next time.
 *
 * By default (`holdBackFinalBlock: false`) a block is flushed as soon as it
 * completes — correct whenever finalization can unambiguously recognise the
 * true final block from the data itself (e.g. Merkle–Damgård/Keccak padding,
 * which always appends a marker byte, so nothing already flushed can be
 * mistaken for it). Pass `holdBackFinalBlock: true` for algorithms whose
 * finalization instead flips a flag at compress-time with no marker in the data
 * (BLAKE2): then the last full block a chunk completes is always kept back,
 * since flushing it immediately would leave no way to later mark it final
 * without compressing it twice.
 *
 * @example
 * 	```ts
 * 	const acc = new BlockAccumulator(4, (block, offset) =>
 * 		console.log(block.subarray(offset, offset + 4)),
 * 	);
 * 	acc.absorb(new Uint8Array([1, 2, 3])); // buffered, no full block yet
 * 	acc.absorb(new Uint8Array([4, 5])); // logs [1,2,3,4]; tail is now [5]
 * 	```;
 */
export class BlockAccumulator {
	private tail_ = new Uint8Array(0);

	/**
	 * @param blockSizeBytes The fixed block size `processBlock` is called with.
	 * @param processBlock Invoked once per full block, in order, never with a
	 *   partial block.
	 * @param holdBackFinalBlock When `true`, the last full block a chunk
	 *   completes is kept in `tail` rather than flushed immediately — see the
	 *   class doc above.
	 */
	constructor(
		private readonly blockSizeBytes: number,
		private readonly processBlock: (block: Uint8Array, offset: number) => void,
		private readonly holdBackFinalBlock = false,
	) {}

	/** The bytes buffered since the last full block, not yet processed. */
	get tail(): Uint8Array<ArrayBuffer> {
		return this.tail_;
	}

	/** Discard everything held, without processing it. */
	clear(): void {
		this.tail_ = new Uint8Array(0);
	}

	/** Buffers `chunk`, processing every full block it completes. */
	absorb(chunk: Uint8Array): void {
		let combined: Uint8Array;

		if (this.tail_.length > 0) {
			combined = new Uint8Array(this.tail_.length + chunk.length);
			combined.set(this.tail_);
			combined.set(chunk, this.tail_.length);
		} else {
			combined = chunk;
		}

		let offset = 0;

		while (
			this.holdBackFinalBlock
				? combined.length - offset > this.blockSizeBytes
				: combined.length - offset >= this.blockSizeBytes
		) {
			this.processBlock(combined, offset);
			offset += this.blockSizeBytes;
		}

		// slice() copies, so mutating the caller's chunk after absorb() returns
		// can never corrupt the carried tail.
		this.tail_ = combined.slice(offset);
	}
}
