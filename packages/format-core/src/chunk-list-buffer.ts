import { decodeText, type TextEncodingName } from "@ac-kit/core";

import type { ByteCursor } from "./byte-cursor.js";
import type { DecodeBuffer } from "./decode-buffer.js";

const DEFAULT_ENCODING_: TextEncodingName = "utf-8";

/**
 * Locates an absolute position (0 = first unconsumed byte) within a chunk list,
 * honoring the offset already consumed from the first chunk.
 */
function locate(
	chunks: readonly Uint8Array[],
	firstChunkOffset: number,
	position: number,
): { chunkIndex: number; offset: number } | null {
	let base = 0;
	for (let index = 0; index < chunks.length; index++) {
		const startOffset = index === 0 ? firstChunkOffset : 0;
		const chunkLength = chunks[index]!.length - startOffset;
		if (position < base + chunkLength) {
			return { chunkIndex: index, offset: startOffset + (position - base) };
		}
		base += chunkLength;
	}
	return null;
}

/**
 * A {@link ByteCursor} over an immutable snapshot of a chunk list, taken at
 * {@link ChunkListBuffer.view} time. Chunks are never mutated in place — only
 * appended or dropped from the buffer's own list — so holding a reference to
 * them plus the offset already consumed from the first one is a valid,
 * self-contained snapshot for the cursor's lifetime.
 */
class ChunkListCursor implements ByteCursor {
	private position = 0;

	constructor(
		private readonly chunks: readonly Uint8Array[],
		private readonly firstChunkOffset: number,
		private readonly totalLength: number,
	) {}

	get remaining(): number {
		return this.totalLength - this.position;
	}

	peekByte(offset: number): number | undefined {
		const at = locate(
			this.chunks,
			this.firstChunkOffset,
			this.position + offset,
		);
		return at ? this.chunks[at.chunkIndex]![at.offset] : undefined;
	}

	indexOf(needle: number | Uint8Array, from = 0): number {
		if (typeof needle === "number") {
			for (let offset = from; offset < this.remaining; offset++) {
				if (this.peekByte(offset) === needle) {
					return offset;
				}
			}
			return -1;
		}

		if (needle.length === 0) {
			return from;
		}
		for (
			let offset = from;
			offset + needle.length <= this.remaining;
			offset++
		) {
			let matched = true;
			for (let i = 0; i < needle.length; i++) {
				if (this.peekByte(offset + i) !== needle[i]) {
					matched = false;
					break;
				}
			}
			if (matched) {
				return offset;
			}
		}
		return -1;
	}

	peekBytes(length: number): Uint8Array {
		if (length > this.remaining) {
			throw new RangeError(
				`Requested ${length} bytes, only ${this.remaining} available`,
			);
		}
		const out = new Uint8Array(length);
		for (let i = 0; i < length; i++) {
			out[i] = this.peekByte(i)!;
		}
		return out;
	}

	readBytes(length: number): Uint8Array {
		const contiguous = this.contiguous(length);
		const bytes = contiguous ? contiguous.slice() : this.peekBytes(length);
		this.position += length;
		return bytes;
	}

	readString(length: number, encoding = DEFAULT_ENCODING_): string {
		const bytes = this.readBytes(length);
		return decodeText(bytes, encoding);
	}

	skip(length: number): void {
		if (length > this.remaining) {
			throw new RangeError(
				`Cannot skip ${length} bytes, only ${this.remaining} available`,
			);
		}
		this.position += length;
	}

	contiguous(length: number): Uint8Array | null {
		if (length > this.remaining) {
			return null;
		}
		const at = locate(this.chunks, this.firstChunkOffset, this.position);
		if (!at) {
			return length === 0 ? new Uint8Array(0) : null;
		}
		const chunk = this.chunks[at.chunkIndex]!;
		if (chunk.length - at.offset < length) {
			return null;
		}
		return chunk.subarray(at.offset, at.offset + length);
	}
}

/**
 * Zero-copy-on-append {@link DecodeBuffer} over a chunk list, exposed to
 * decoders as a {@link ByteCursor}.
 *
 * Trades a cheaper {@link append} (no copy, unlike `ByteAccumulator`'s arena)
 * for a costlier per-byte read (a method call and a linear chunk-list search
 * instead of a native `Uint8Array` index). `ByteAccumulator` is the better
 * default: a decode buffer holds control data — commands, headers, length
 * prefixes — while declared payloads stream past it, so the copy it pays is
 * bounded by the decoder's own limits. Reach for this one only when a protocol
 * accumulates a large value outside a declared body.
 */
export class ChunkListBuffer implements DecodeBuffer<ByteCursor, Uint8Array> {
	private chunks: Uint8Array[] = [];
	private firstChunkOffset = 0;
	private totalBuffered = 0;

	get buffered(): number {
		return this.totalBuffered;
	}

	append(chunk: Uint8Array): void {
		if (chunk.length === 0) {
			return;
		}
		this.chunks.push(chunk);
		this.totalBuffered += chunk.length;
	}

	view(): ByteCursor {
		return new ChunkListCursor(
			this.chunks,
			this.firstChunkOffset,
			this.totalBuffered,
		);
	}

	consume(count: number): void {
		let remaining = count > this.totalBuffered ? this.totalBuffered : count;
		this.totalBuffered -= remaining;

		while (remaining > 0 && this.chunks.length > 0) {
			const chunk = this.chunks[0]!;
			const available = chunk.length - this.firstChunkOffset;
			if (remaining < available) {
				this.firstChunkOffset += remaining;
				remaining = 0;
			} else {
				remaining -= available;
				this.chunks.shift();
				this.firstChunkOffset = 0;
			}
		}
	}

	take(): Uint8Array {
		const cursor = this.view();
		const out = cursor.readBytes(this.totalBuffered);
		this.clear();
		return out;
	}

	clear(): void {
		this.chunks = [];
		this.firstChunkOffset = 0;
		this.totalBuffered = 0;
	}
}
