import type { IAggregateError } from "../../error/aggregate-error.js";
import type { ISuppressedError } from "../../error/suppressed-error.js";
import { jsonMakeReplacerFunction } from "../make-replacer-function.js";

/**
 * Create a JSON replacer function that converts Error objects into plain objects
 * containing their non-enumerable properties (name, message, stack, cause, etc.)
 * along with any enumerable properties.
 *
 * This function can be used as a base replacer to ensure that Error objects are
 * properly serialized during JSON serialization, and can be combined with a user-defined
 * replacer for additional customization.
 *
 * @param replacer An optional user-defined replacer (function or property list) to apply after the Error replacer.
 * @returns A JSON replacer function that handles Error objects and applies the user-defined replacer if provided.
 */
export function jsonMakeErrorReplacerFunction(
	replacer?: JsonReplacer,
): JsonReplacerFunction {
	return jsonMakeReplacerFunction((_key, value) => {
		if (value instanceof Error) {
			const {
				// Error non-enumerable properties
				name,
				message,
				stack,
				cause,

				// AggregateError non-enumerable properties
				errors,

				// SuppressedError non-enumerable properties
				suppressed,
				error,

				// Other enumerable properties
				...restError
			} = value as Error &
				Partial<IAggregateError> &
				Partial<ISuppressedError> &
				Record<string, unknown>;

			return {
				name,
				message,
				stack,
				cause,
				errors,
				suppressed,
				error,
				...restError,
			};
		}

		return value;
	}, replacer);
}
