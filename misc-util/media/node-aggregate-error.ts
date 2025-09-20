import {
	type IAggregateError,
	isAggregateErrorLike,
} from "../../ecma/error/aggregate-error.js";
import { type INodeError, isNodeErrorLike } from "./node-error.js";

/**
 * Node AggregateError interface (AggregateError with a code property)
 *
 * @see https://github.com/nodejs/node/blob/main/lib/internal/errors.js
 */
export interface INodeAggregateError extends IAggregateError, INodeError {}

/**
 * Test if value is Node AggregateError-like (has name, message, code and errors properties)
 *
 * @param value The value to test
 * @returns True if the value is Node AggregateError-like
 */
export function isNodeAggregateErrorLike(
	value: unknown,
): value is INodeAggregateError {
	return isAggregateErrorLike(value) && isNodeErrorLike(value);
}
