import shallowClone from "shallow-clone";
import { UnsupportedError } from "../error/unsupported-error.js";
import { isPrimitive } from "../is-primitive.js";

/**
 * Clone a value non-recursively.
 *
 * Based on the shallow-clone library.
 *
 * @param value The value to clone
 * @returns The cloned value
 */
export function clone<T>(value: T): T {
	if (isPrimitive(value)) {
		if (typeof value === "symbol") {
			throw new UnsupportedError("symbols cannot be cloned");
		}

		return value;
	}

	const cloned = shallowClone(value);

	// library returns the same reference if it cannot clone the value
	if (value === cloned) {
		throw new UnsupportedError(`value type "${typeof value}"`);
	}

	return cloned;
}
