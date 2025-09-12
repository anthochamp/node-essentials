import type { JsonObject, JsonValue } from "type-fest";
import { isAggregateErrorLike } from "../error/aggregate-error.js";
import { type IError, isErrorLike } from "../error/error.js";
import { jsonSerialize } from "./json-serialize.js";
import { makeJsonReplacerFunction } from "./make-json-replacer-function.js";

export type JsonError = JsonObject & {
	name: string;
	message: string;
	stack?: string;
	cause?: JsonError | JsonValue;
};

export type JsonAggregateError = JsonError & {
	errors: (JsonError | JsonValue)[];
};

/**
 * Serialize an Error object to a JSON-compatible format.
 *
 * The function extracts standard properties like `name`, `message`, `stack`,
 * and `cause`, as well as any enumerable own properties of the error object.
 *
 * If the error is an AggregateError, it also serializes the `errors` property.
 *
 * @param error The Error object to serialize.
 * @param replacer An optional replacer function to customize the serialization of values.
 * @returns A JSON representation of the error.
 */
export function jsonSerializeError<T extends IError>(
	error: T,
	replacer?: JsonReplacer,
): JsonError {
	const { name, message, stack, cause, ...restError } = error;

	const result: JsonError = {
		name,
		message,
	};

	if (stack !== undefined) {
		result.stack = stack;
	}

	const internalReplacer = makeJsonReplacerFunction(
		(_key: string, value: unknown) => {
			if (isErrorLike(value)) {
				return jsonSerializeError(value, replacer);
			}

			return value;
		},
		replacer,
	);

	const serializedCause = jsonSerialize(cause, internalReplacer);
	if (serializedCause !== undefined) {
		result.cause = serializedCause;
	}

	for (const [k, v] of Object.entries(restError)) {
		const serializedValue = jsonSerialize(v, internalReplacer);
		if (serializedValue !== undefined) {
			result[k] = serializedValue;
		}
	}

	if (isAggregateErrorLike(error)) {
		result.errors = error.errors.reduce((acc, innerError) => {
			const serializedInnerError = jsonSerialize(innerError, internalReplacer);
			if (serializedInnerError !== undefined) {
				acc.push(serializedInnerError);
			}
			return acc;
		}, []);
	}

	return result;
}
