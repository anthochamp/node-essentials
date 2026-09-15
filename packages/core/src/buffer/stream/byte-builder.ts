import { concatBytes } from "../concat-bytes.js";

/**
 * Accumulates byte chunks and concatenates them into one `Uint8Array` on demand
 * — an incremental writer for any binary format built up byte-by-byte or
 * chunk-by-chunk (PEM framing, SSH wire messages, PGP packets, ASN.1 codecs,
 * …).
 *
 * Every `write`/`writeByte` call is O(1) (a chunk is only ever appended, never
 * copied or re-allocated); the cost of concatenation is paid exactly once, in
 * `toBytes()`.
 */
export class ByteBuilder {
	private readonly chunks: Uint8Array[] = [];
	private byteLength_ = 0;

	/** Total bytes written so far. */
	get byteLength(): number {
		return this.byteLength_;
	}

	/** Appends a single byte, taken mod 256. */
	writeByte(byte: number): void {
		this.chunks.push(Uint8Array.of(byte & 0xff));
		this.byteLength_ += 1;
	}

	/** Appends `bytes` verbatim. A zero-length input is a no-op. */
	write(bytes: Uint8Array): void {
		if (bytes.length === 0) {
			return;
		}

		this.chunks.push(bytes);
		this.byteLength_ += bytes.length;
	}

	/** Concatenates every chunk written so far into one `Uint8Array`. */
	toBytes(): Uint8Array {
		if (this.chunks.length === 1) {
			return this.chunks[0]!;
		}

		return concatBytes(this.chunks);
	}
}
