/**
 * A cursor over an existing `Uint8Array`, reading individual bits MSB-first
 * within each byte — the bit-level counterpart of {@link ByteReader}, for any
 * bit-packed format (ASN.1 PER/X.691, other bitfield-oriented wire protocols).
 *
 * Every read advances the cursor by the number of bits read; nothing is copied.
 */
export class BitReader {
	private bytePos = 0;
	private bitPos = 0; // Within the current byte: 0 is the MSB, 7 the LSB.

	/**
	 * @param bytes The bytes to read from. Not copied — mutating `bytes` after
	 *   construction is visible to this reader.
	 */
	constructor(private readonly bytes: Uint8Array) {}

	/** How many bits remain unread. */
	get bitsRemaining(): number {
		return (this.bytes.length - this.bytePos) * 8 - this.bitPos;
	}

	/** Whether every bit has been read. */
	get atEnd(): boolean {
		return this.bytePos >= this.bytes.length && this.bitPos === 0;
	}

	private nextBit(): 0 | 1 {
		if (this.bytePos >= this.bytes.length) {
			throw new RangeError("BitReader: unexpected end of input");
		}

		const bit = (this.bytes[this.bytePos]! >>> (7 - this.bitPos)) & 1;

		this.bitPos++;
		if (this.bitPos === 8) {
			this.bytePos++;
			this.bitPos = 0;
		}

		return bit as 0 | 1;
	}

	/** Reads and returns the next bit, advancing the cursor by one. */
	readBit(): 0 | 1 {
		return this.nextBit();
	}

	/**
	 * Reads the next `n` bits as an unsigned integer, MSB first.
	 *
	 * @throws {RangeError} When `n` is greater than 32 — use {@link readBigBits}
	 *   for a wider field.
	 */
	readBits(n: number): number {
		if (n > 32) {
			throw new RangeError(
				"BitReader.readBits: n must be <= 32; use readBigBits for a wider value",
			);
		}

		let result = 0;
		for (let i = 0; i < n; i++) {
			result = (result << 1) | this.nextBit();
		}
		return result;
	}

	/**
	 * Reads the next `n` bits as an unsigned integer, MSB first — the `bigint`
	 * counterpart of {@link readBits}, for `n` beyond 32 (e.g. a PER constrained
	 * integer whose range needs more than 32 bits).
	 */
	readBigBits(n: number): bigint {
		let result = 0n;
		for (let i = 0; i < n; i++) {
			result = (result << 1n) | BigInt(this.nextBit());
		}
		return result;
	}

	/** For aligned PER-style formats: advances to the next byte boundary. */
	align(): void {
		if (this.bitPos > 0) {
			this.bytePos++;
			this.bitPos = 0;
		}
	}

	/**
	 * Reads `n` complete bytes as a view (not a copy) into the underlying buffer.
	 *
	 * @throws {RangeError} When the cursor isn't currently byte-aligned, or fewer
	 *   than `n` bytes remain.
	 */
	readBytes(n: number): Uint8Array {
		if (this.bitPos !== 0) {
			throw new RangeError("BitReader.readBytes: not byte-aligned");
		}

		if (this.bytePos + n > this.bytes.length) {
			throw new RangeError("BitReader.readBytes: insufficient data");
		}

		const view = this.bytes.subarray(this.bytePos, this.bytePos + n);
		this.bytePos += n;
		return view;
	}

	/** Reads a complete byte (8 bits). */
	readByte(): number {
		return this.readBits(8);
	}
}
