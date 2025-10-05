import { clamp } from "../math/clamp.js";

/**
 * A C-like string pointer.
 *
 * It maintains an offset into a string and provides methods to get the
 * substring from the current offset, check if the offset is out of range,
 * and get the length of the remaining string.
 */
export class StringPointer {
	private _valueCache: string | null = null;
	private _offset: number = 0;

	/**
	 * Creates a new `StringPointer` instance.
	 *
	 * @param source The source string.
	 */
	constructor(readonly source: string) {}

	/**
	 * The current offset.
	 */
	get offset(): number {
		return this._offset;
	}

	/**
	 * Sets the current offset.
	 */
	set offset(offset: number) {
		if (this._offset !== offset) {
			this._offset = offset;
			this._valueCache = null;
		}
	}

	/**
	 * Checks if the current offset is out of range of the source string.
	 *
	 * @returns `true` if the offset is out of range, `false` otherwise.
	 */
	isOutOfRange(): boolean {
		return this.offset < 0 || this.offset >= this.source.length;
	}

	/**
	 * The length of the remaining string from the current offset.
	 */
	get length(): number {
		return this.source.length - this.getBoundedOffset();
	}

	/**
	 * The substring from the current offset to the end of the string.
	 */
	get value(): string {
		if (this._valueCache === null) {
			this._valueCache = this.source.substring(this.getBoundedOffset());
		}

		return this._valueCache;
	}

	private getBoundedOffset(): number {
		return clamp(this.offset, 0, this.source.length);
	}
}
