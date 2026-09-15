import { encodeText } from "@ac-kit/core";

import type { DecodeBuffer } from "./decode-buffer.js";
import { TextBuffer } from "./text-buffer.js";

/**
 * A {@link DecodeBuffer} that accepts byte chunks and windows them as text.
 *
 * The `Chunk`/`View` split exists for exactly this: a decoder written against
 * `string` (NDJSON, CSV, INI) can be driven straight from a byte source without
 * the caller inserting a `TextDecoderStream` and without each format
 * hand-rolling its own driver wiring.
 *
 * The `TextDecoder` is held across appends, so a multi-byte sequence split over
 * a chunk boundary is reassembled rather than replaced.
 */
export class TextDecodeBuffer implements DecodeBuffer<string, Uint8Array> {
	private readonly text: TextBuffer;
	private readonly decoder: TextDecoder;

	/**
	 * @param maxSize - Maximum retained code-unit count; must be greater than
	 *   zero.
	 * @param encoding - Label for the incoming bytes. Defaults to UTF-8.
	 */
	constructor(maxSize: number, encoding = "utf-8") {
		this.text = new TextBuffer(maxSize);
		this.decoder = new TextDecoder(encoding);
	}

	get buffered(): number {
		return this.text.buffered;
	}

	append(chunk: Uint8Array): void {
		this.text.append(this.decoder.decode(chunk, { stream: true }));
	}

	/** Flush any bytes the decoder is holding back, at end of input. */
	finish(): void {
		this.text.append(this.decoder.decode());
	}

	view(): string {
		return this.text.view();
	}

	consume(count: number): void {
		this.text.consume(count);
	}

	/** Residue is re-encoded as UTF-8, whatever the input encoding was. */
	take(): Uint8Array {
		return encodeText(this.text.take(), "utf-8");
	}

	clear(): void {
		this.text.clear();
	}
}
