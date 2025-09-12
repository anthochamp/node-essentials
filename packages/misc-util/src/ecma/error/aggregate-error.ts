import type { RequiredKeysOf } from "type-fest";
import { isErrorLike } from "./error.js";

/**
 * Type alias for the built-in AggregateError type.
 *
 * Helps clarify the code to disambugate between the AggregateError JS class and
 * its interface (type), which have the same name, which can be confusing when
 * referring to an object that looks like an AggregateError but is not an instance
 * of the AggregateError class.
 */
export type IAggregateError = AggregateError;

/**
 * Test if value is AggregateError-like (has name, message and errors properties)
 */
export function isAggregateErrorLike(value: unknown): value is IAggregateError {
	if (value instanceof AggregateError || isErrorLike(value)) {
		const { errors } = value as Pick<
			IAggregateError,
			RequiredKeysOf<IAggregateError>
		>;

		return errors !== undefined;
	}

	return false;
}
