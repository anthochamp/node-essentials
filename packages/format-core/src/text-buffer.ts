import { BufferOverflowError } from "@ac-kit/core";

import type { DecodeBuffer } from "./decode-buffer.js";

/**
 * A {@link DecodeBuffer} over accumulated text.
 *
 * Byte→text conversion happens upstream (a `TextDecoderStream` or
 * `CharsetDecodeStream`); this only concatenates and windows the resulting
 * strings, so `consumed` counts UTF-16 code units, matching `String` indexing.
 */
export class TextBuffer implements DecodeBuffer<string> {
	private text = "";

	/**
	 * Construct a buffer with a maximum retained code-unit count.
	 *
	 * The ceiling is mandatory for the same reason `ByteAccumulator`'s is: a
	 * decoder that never reaches a verdict would otherwise let a peer grow this
	 * without bound.
	 *
	 * @param maxSize - Maximum retained code-unit count; must be greater than
	 *   zero.
	 */
	constructor(private readonly maxSize: number) {
		if (maxSize <= 0) {
			throw new RangeError("maxSize must be greater than zero");
		}
	}

	get buffered(): number {
		return this.text.length;
	}

	/**
	 * @throws {BufferOverflowError} If the retained count would exceed the
	 *   configured ceiling.
	 */
	append(chunk: string): void {
		const needed = this.text.length + chunk.length;
		if (needed > this.maxSize) {
			throw new BufferOverflowError(
				`Buffer limit exceeded: ${needed} > ${this.maxSize} code units`,
			);
		}
		this.text += chunk;
	}

	view(): string {
		return this.text;
	}

	consume(count: number): void {
		this.text = this.text.slice(
			count > this.text.length ? this.text.length : count,
		);
	}

	take(): string {
		const out = this.text;
		this.text = "";
		return out;
	}

	clear(): void {
		this.text = "";
	}
}
