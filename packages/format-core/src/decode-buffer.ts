/**
 * Accumulates and windows the units a {@link Decoder} reads.
 *
 * `Chunk` is the type appended (what arrives) and `View` is the type read back
 * (what a decoder sees); they diverge for a non-contiguous backing — appending
 * `Uint8Array` chunks while viewing them through a `ByteCursor` — so a single
 * type parameter would be inexpressible here.
 *
 * @template View - What {@link view} and {@link take} return.
 * @template Chunk - What {@link append} accepts. Defaults to `View` for the
 *   common contiguous case.
 */
export interface DecodeBuffer<View, Chunk = View> {
	/** Unconsumed unit count currently held. */
	readonly buffered: number;

	/** Append `chunk`, growing or compacting the backing as needed. */
	append(chunk: Chunk): void;

	/**
	 * Release anything the backing is holding back pending more input, called
	 * once when no further {@link append} will happen.
	 *
	 * Only a converting backing needs this — a `TextDecoder` withholds the bytes
	 * of a sequence split across a chunk boundary, and at end of input they must
	 * become a replacement character rather than vanish.
	 */
	finish?(): void;

	/**
	 * Window over the unconsumed units. Invalidated by the next {@link append} or
	 * {@link consume}; copy before retaining.
	 */
	view(): View;

	/** Drop `count` units from the front. */
	consume(count: number): void;

	/** Remove and return the unconsumed units, resetting the buffer. */
	take(): Chunk;

	/** Discard everything held. */
	clear(): void;
}
