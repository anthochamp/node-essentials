import { BufferOverflowError } from "../../error/buffer-overflow-error.js";

const DEFAULT_INITIAL_CAPACITY_ = 8192;

export type ByteAccumulatorOptions = {
	/** Initial arena capacity; will grow as needed. */
	initialCapacity?: number;
};

/**
 * Growable byte arena with a read cursor — an incremental receive buffer for
 * any producer/consumer pair where bytes arrive in arbitrary-sized chunks but
 * must be consumed as a contiguous, possibly-partial window (a network receive
 * path, a decompression sink, any stream reassembly).
 *
 * Incoming chunks are copied once into a contiguous arena; consumed bytes only
 * advance a read offset. Total copy cost is therefore linear in the number of
 * bytes received, rather than the quadratic cost of concatenating the pending
 * buffer with every arriving chunk.
 *
 * ## View lifetime
 *
 * {@link view} returns a window into the arena, not a copy. It is valid **only
 * until the next {@link append} or {@link consume}** — compaction and growth
 * both relocate live bytes. A consumer that retains any part of a view must
 * copy it first.
 */
export class ByteAccumulator {
	private buffer: Uint8Array<ArrayBuffer>;
	private readPos = 0;
	private writePos = 0;

	/**
	 * Construct a new accumulator with a maximum retained byte count. The arena
	 * will grow as needed, but {@link append} will throw if the retained byte
	 * count would exceed `maxSize`.
	 *
	 * @param maxSize - Maximum retained byte count; must be greater than zero.
	 * @param options - See {@link ByteAccumulatorOptions}.
	 */
	constructor(
		private readonly maxSize: number,
		options?: ByteAccumulatorOptions,
	) {
		if (maxSize <= 0) {
			throw new RangeError("maxSize must be greater than zero");
		}
		const initial = Math.min(
			options?.initialCapacity ?? DEFAULT_INITIAL_CAPACITY_,
			maxSize,
		);
		this.buffer = new Uint8Array(initial);
	}

	/** Number of unconsumed bytes currently held. */
	get buffered(): number {
		return this.writePos - this.readPos;
	}

	/** Current arena capacity, for diagnostics and tests. */
	get capacity(): number {
		return this.buffer.length;
	}

	/**
	 * Copy `chunk` into the arena, growing or compacting as needed.
	 *
	 * @throws {BufferOverflowError} If the retained byte count would exceed the
	 *   configured ceiling.
	 */
	append(chunk: Uint8Array): void {
		if (chunk.length === 0) {
			return;
		}

		const live = this.buffered;
		const needed = live + chunk.length;
		if (needed > this.maxSize) {
			throw new BufferOverflowError(
				`Buffer limit exceeded: ${needed} > ${this.maxSize} bytes`,
			);
		}

		if (this.writePos + chunk.length > this.buffer.length) {
			if (needed <= this.buffer.length) {
				this.compact();
			} else {
				this.grow(needed);
			}
		}

		this.buffer.set(chunk, this.writePos);
		this.writePos += chunk.length;
	}

	/**
	 * Window over the unconsumed bytes. Invalidated by the next {@link append} or
	 * {@link consume}; copy before retaining.
	 */
	view(): Uint8Array<ArrayBuffer> {
		return this.buffer.subarray(this.readPos, this.writePos);
	}

	/** Drop `count` bytes from the front. */
	consume(count: number): void {
		if (count <= 0) {
			return;
		}
		this.readPos += count > this.buffered ? this.buffered : count;
		// Fully drained is the steady state: resetting here avoids ever copying.
		if (this.readPos === this.writePos) {
			this.readPos = 0;
			this.writePos = 0;
		}
	}

	/**
	 * Copy out the unconsumed bytes and reset. Used to hand residue to another
	 * consumer across a protocol/format switch.
	 */
	take(): Uint8Array<ArrayBuffer> {
		const out = this.buffer.slice(this.readPos, this.writePos);
		this.readPos = 0;
		this.writePos = 0;
		return out;
	}

	/** Discard everything held. */
	clear(): void {
		this.readPos = 0;
		this.writePos = 0;
	}

	private compact(): void {
		this.buffer.copyWithin(0, this.readPos, this.writePos);
		this.writePos -= this.readPos;
		this.readPos = 0;
	}

	private grow(needed: number): void {
		let capacity = this.buffer.length;
		while (capacity < needed) {
			capacity *= 2;
		}
		if (capacity > this.maxSize) {
			capacity = this.maxSize;
		}
		const next = new Uint8Array(capacity);
		next.set(this.buffer.subarray(this.readPos, this.writePos));
		this.buffer = next;
		this.writePos -= this.readPos;
		this.readPos = 0;
	}
}
