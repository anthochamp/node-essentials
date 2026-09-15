import type { Encoder } from "../encoder.js";

/**
 * Creates the write half of delimiter-terminated framing.
 *
 * Returns `[value, delimiter]` rather than a concatenation, so the payload is
 * never copied on the way out.
 *
 * @param delimiter - The byte sequence appended after each value. Must not be
 *   empty.
 */
export function createDelimitedEncoder(
	delimiter: Uint8Array,
): Encoder<Uint8Array> {
	if (delimiter.length === 0) {
		throw new RangeError("delimiter must not be empty");
	}

	return {
		encode(value: Uint8Array): readonly Uint8Array[] {
			return [value, delimiter];
		},
	};
}
