import type { TextEncodingName } from "@ac-kit/core";

/**
 * Sequential reader over a possibly non-contiguous byte sequence.
 *
 * All methods are relative to an internal cursor, reset to position 0 before
 * each decode attempt by whatever {@link DecodeDriver} owns the backing
 * {@link ChunkListBuffer} — a decoder still reports `consumed`, so the single
 * `DecodeResult` contract holds whether the backing is contiguous or not.
 * `peek*` inspects without advancing; `read*` advances. Absolute positions are
 * never exposed, so a decoder written against this interface is agnostic to the
 * backing layout.
 *
 * Named `ByteCursor`, not `ByteReader` — `@ac-kit/core` already exports a
 * concrete `ByteReader` over a single contiguous `Uint8Array` (used by the
 * ASN.1 codecs); this is an unrelated type for an unrelated problem (decoding
 * over a chunk list without a single contiguous copy).
 */
export interface ByteCursor {
	/** Unread bytes remaining. */
	readonly remaining: number;

	/** Byte at `offset` from the cursor, or `undefined` past the end. */
	peekByte(offset: number): number | undefined;

	/** Index of `needle` relative to the cursor, or `-1`. */
	indexOf(needle: number | Uint8Array, from?: number): number;

	/** Copy `length` bytes from the cursor without advancing. */
	peekBytes(length: number): Uint8Array;

	/** Copy `length` bytes and advance the cursor. */
	readBytes(length: number): Uint8Array;

	/**
	 * Decode `length` bytes as text and advance the cursor.
	 *
	 * @param encoding Defaults to `"utf-8"`.
	 */
	readString(length: number, encoding?: TextEncodingName): string;

	/** Advance the cursor without copying. */
	skip(length: number): void;

	/**
	 * Contiguous window over the next `length` bytes when the backing allows it,
	 * otherwise `null`. Lets a hot decoder take a zero-copy fast path and fall
	 * back to {@link readBytes} only when a value straddles a chunk boundary.
	 */
	contiguous(length: number): Uint8Array | null;
}
