import { indexOfSequence } from "@ac-kit/core";

import { type DecodeResult, decodeIncomplete } from "../decode-result.js";
import type { Decoder } from "../decoder.js";

const DEFAULT_MAX_VALUE_LENGTH_ = 65536;

export type DelimitedDecoderOptions = {
	/**
	 * Maximum value length in bytes, excluding the delimiter.
	 *
	 * Defaults to 65536 bytes.
	 */
	maxValueLength?: number;
};

/**
 * Creates the read half of delimiter-terminated framing for binary payloads.
 *
 * Use when values end in a fixed byte sequence that is not a newline, such as a
 * NUL-terminated record stream.
 *
 * A factory rather than a class because the scan restarts from the front of the
 * window on every call — there is no cross-call state to hold.
 *
 * @param delimiter - The byte sequence that terminates each value. Must not be
 *   empty.
 * @param options - See {@link DelimitedDecoderOptions}.
 */
export function createDelimitedDecoder(
	delimiter: Uint8Array,
	options?: DelimitedDecoderOptions,
): Decoder<Uint8Array> {
	if (delimiter.length === 0) {
		throw new RangeError("delimiter must not be empty");
	}

	const maxValueLength = options?.maxValueLength ?? DEFAULT_MAX_VALUE_LENGTH_;

	return {
		decode(view: Uint8Array): DecodeResult<Uint8Array> {
			const index = indexOfSequence(view, delimiter);

			if (index === -1) {
				if (view.length > maxValueLength) {
					return {
						status: "error",
						error: new Error(
							`Value exceeds ${maxValueLength} bytes without a delimiter`,
						),
						consumed: view.length,
					};
				}

				return decodeIncomplete(view.length + delimiter.length);
			}

			if (index > maxValueLength) {
				return {
					status: "error",
					error: new Error(
						`Value of ${index} bytes exceeds the ${maxValueLength} byte limit`,
					),
					consumed: index + delimiter.length,
				};
			}

			return {
				status: "decoded",
				// Copy: the view is invalidated as soon as the driver consumes.
				value: view.slice(0, index),
				consumed: index + delimiter.length,
			};
		},
	};
}
