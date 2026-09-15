/**
 * Accumulates individual bits into bytes, MSB-first within each byte — the
 * bit-level counterpart of {@link ByteBuilder}, for any bit-packed format (ASN.1
 * PER/X.691, other bitfield-oriented wire protocols).
 *
 * Every `writeBit`/`writeBits` call is O(1) (or O(n) in the bit count for
 * `writeBits`, never re-walking bits already written); the cost of assembling
 * the final byte array is paid once, in `result()`.
 */
export class BitBuilder {
	private readonly bytes: number[] = [];
	private currentByte = 0;
	private bitsInCurrent = 0;

	/** Total bits written so far. */
	get bitLength(): number {
		return this.bytes.length * 8 + this.bitsInCurrent;
	}

	/** Writes a single bit. */
	writeBit(bit: 0 | 1): void {
		this.currentByte = (this.currentByte << 1) | bit;
		this.bitsInCurrent++;

		if (this.bitsInCurrent === 8) {
			this.bytes.push(this.currentByte);
			this.currentByte = 0;
			this.bitsInCurrent = 0;
		}
	}

	/**
	 * Writes the low `n` bits of `value`, MSB first.
	 *
	 * @param value - The bits to write. A plain `number` covers `n` up to 32 —
	 *   the range JS's `<<`/`>>>` bitwise operators support; a `bigint` covers
	 *   any wider `n` (e.g. a PER constrained integer whose range needs more than
	 *   32 bits).
	 * @param n - How many low bits of `value` to write.
	 * @throws {RangeError} When `value` is a plain `number` and `n` is greater
	 *   than 32.
	 */
	writeBits(value: number, n: number): void;
	writeBits(value: bigint, n: number): void;
	writeBits(value: number | bigint, n: number): void {
		if (typeof value === "bigint") {
			for (let shift = BigInt(n - 1); shift >= 0n; shift -= 1n) {
				this.writeBit(Number((value >> shift) & 1n) as 0 | 1);
			}
			return;
		}

		if (n > 32) {
			throw new RangeError(
				"BitBuilder.writeBits: n must be <= 32 for a number value; pass a bigint for a wider value",
			);
		}

		for (let i = n - 1; i >= 0; i--) {
			this.writeBit(((value >>> i) & 1) as 0 | 1);
		}
	}

	/**
	 * For aligned PER-style formats: pads with zero bits to the next byte
	 * boundary.
	 */
	align(): void {
		if (this.bitsInCurrent > 0) {
			this.bytes.push(this.currentByte << (8 - this.bitsInCurrent));
			this.currentByte = 0;
			this.bitsInCurrent = 0;
		}
	}

	/** Writes a complete byte (8 bits). */
	writeByte(value: number): void {
		this.writeBits(value, 8);
	}

	/** Writes every byte of `data`, in order. */
	writeBytes(data: Uint8Array): void {
		for (let i = 0; i < data.length; i++) {
			this.writeByte(data[i]!);
		}
	}

	/**
	 * Produces the accumulated bytes, padding the last one with zero bits if
	 * needed.
	 */
	result(): Uint8Array {
		const bytes = this.bytes.slice();

		if (this.bitsInCurrent > 0) {
			bytes.push(this.currentByte << (8 - this.bitsInCurrent));
		}

		return Uint8Array.from(bytes);
	}
}
