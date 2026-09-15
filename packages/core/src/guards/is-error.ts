import { isObject } from "../guards/is-object.js";
import { IError } from "../types/error.js";

/** Test if value is Error-like (has name and message properties) */
export function isErrorLike(value: unknown): value is IError {
	return isObject(value) && "name" in value && "message" in value;
}
