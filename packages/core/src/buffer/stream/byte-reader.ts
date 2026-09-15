/**
 * A cursor over an existing `Uint8Array` — a sequential reader for any binary
 * format consumed byte-by-byte or field-by-field (PEM framing, SSH wire
 * messages, PGP packets, ASN.1 codecs, …).
 *
 * Every read advances `position`. Nothing is copied except when a caller
 * explicitly asks for one: `read` returns a view via `subarray`, not a copy — a
 * caller that needs an owned copy should call `.slice()` on the result itself.
 */
export class ByteReader {
	private position_: number;

	/**
	 * @param bytes The bytes to read from. Not copied — mutating `bytes` after
	 *   construction is visible to this reader.
	 * @param initialPosition Where to start reading from. Defaults to 0.
	 * @throws {RangeError} When `initialPosition` is out of `bytes`' range.
	 */
	constructor(
		private readonly bytes: Uint8Array,
		initialPosition = 0,
	) {
		if (initialPosition < 0 || initialPosition > bytes.length) {
			throw new RangeError(
				`ByteReader: initialPosition ${initialPosition} out of range for ${bytes.length} bytes`,
			);
		}

		this.position_ = initialPosition;
	}

	/**
	 * The current read position, in bytes from the start of the underlying
	 * buffer.
	 */
	get position(): number {
		return this.position_;
	}

	/** How many bytes remain unread. */
	get remaining(): number {
		return this.bytes.length - this.position_;
	}

	/** The total length of the underlying buffer, regardless of position. */
	get byteLength(): number {
		return this.bytes.length;
	}

	/** Whether every byte has been read. */
	get atEnd(): boolean {
		return this.position_ >= this.bytes.length;
	}

	/**
	 * Reads and returns the next byte, advancing `position` by one.
	 *
	 * @throws {RangeError} When no bytes remain.
	 */
	readByte(): number {
		if (this.atEnd) {
			throw new RangeError("ByteReader.readByte: no bytes remaining");
		}

		const byte = this.bytes[this.position_]!;
		this.position_ += 1;

		return byte;
	}

	/**
	 * Returns the next byte without advancing `position`.
	 *
	 * @throws {RangeError} When no bytes remain.
	 */
	peekByte(): number {
		if (this.atEnd) {
			throw new RangeError("ByteReader.peekByte: no bytes remaining");
		}

		return this.bytes[this.position_]!;
	}

	/**
	 * Reads and returns the next `count` bytes as a view (not a copy) into the
	 * underlying buffer, advancing `position` by `count`.
	 *
	 * @throws {RangeError} When fewer than `count` bytes remain.
	 */
	read(count: number): Uint8Array {
		if (count > this.remaining) {
			throw new RangeError(
				`ByteReader.read: requested ${count} bytes, only ${this.remaining} remain`,
			);
		}

		const view = this.bytes.subarray(this.position_, this.position_ + count);
		this.position_ += count;

		return view;
	}

	/**
	 * Reads the next `count` bytes into a fresh, independent `ByteReader`
	 * positioned at its own start — for a nested, self-contained sub-structure
	 * (an ASN.1 TLV's contents, an SSH/PGP sub-packet) that should be read
	 * without risking overrunning into what follows it.
	 *
	 * @throws {RangeError} When fewer than `count` bytes remain.
	 */
	readSubReader(count: number): ByteReader {
		return new ByteReader(this.read(count));
	}

	/** Returns every remaining byte as a view, without advancing `position`. */
	peekRemaining(): Uint8Array {
		return this.bytes.subarray(this.position_);
	}

	/**
	 * Moves `position` to an absolute offset.
	 *
	 * @throws {RangeError} When `position` is out of range.
	 */
	seek(position: number): void {
		if (position < 0 || position > this.bytes.length) {
			throw new RangeError(
				`ByteReader.seek: position ${position} out of range for ${this.bytes.length} bytes`,
			);
		}

		this.position_ = position;
	}
}
