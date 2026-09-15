import { IAggregateError } from "../types/error.js";
import { isErrorLike } from "./is-error.js";

/**
 * Test if value is AggregateError-like (has name, message and errors
 * properties)
 */
export function isAggregateErrorLike(value: unknown): value is IAggregateError {
	return isErrorLike(value) && "errors" in value;
}
