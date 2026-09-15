import type { ByteReader } from "@ac-kit/core";
import { readVlq } from "@ac-kit/format-varint";

import { DecodingError } from "./errors.js";

/**
 * Reads one base-128 value, reporting any failure as this codec's own
 * {@link DecodingError}.
 *
 * `@ac-kit/format-varint` has its own error hierarchy, but every caller of the
 * ASN.1 decoders catches `DecodingError` and nothing else — a structural
 * rejection that arrives as any other type is a codec bug.
 *
 * @param reader - Cursor positioned at the first byte of the value.
 * @param what - Names the field, for the error message.
 * @param offset - Where the field starts, carried on the error.
 */
export function readVlqField(
	reader: ByteReader,
	what: string,
	offset: number,
): number {
	try {
		return readVlq(reader);
	} catch (error) {
		throw new DecodingError(
			`${what}: ${error instanceof Error ? error.message : String(error)}`,
			offset,
		);
	}
}
