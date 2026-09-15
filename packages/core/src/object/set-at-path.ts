import { UnknownRecord } from "type-fest";

import { isObject } from "../guards/is-object.js";
import { PropertyPath } from "./get-at-path.js";

/**
 * Mutates `root` by setting the value at `path`.
 *
 * Creates intermediate plain objects or arrays as needed based on the type of
 * the next key (`number` → array, `string` → object). Existing `null` or
 * `undefined` intermediates are replaced.
 *
 * @param root The root object/array to mutate
 * @param path The path to traverse
 * @param value The value to set at the path
 */
export function setAtPath(
	root: Record<string, unknown> | unknown[],
	path: PropertyPath,
	value: unknown,
): void {
	if (path.length === 0) {
		return;
	}

	let current: unknown = root;

	for (let i = 0; i < path.length - 1; i++) {
		const key = path[i]!;
		const nextKey = path[i + 1]!;

		if (Array.isArray(current)) {
			const index = +key;
			if (Number.isNaN(index)) {
				return;
			}

			if (!isObject(current[index]) && !Array.isArray(current[index])) {
				current[index] = typeof nextKey === "number" ? [] : {};
			}
			current = current[index];
		} else {
			const obj = current as UnknownRecord;

			if (!isObject(obj[key]) && !Array.isArray(obj[key])) {
				obj[key] = typeof nextKey === "number" ? [] : {};
			}
			current = obj[key];
		}
	}

	const lastKey = path[path.length - 1]!;
	if (Array.isArray(current)) {
		const lastIndex = +lastKey;
		if (Number.isNaN(lastIndex)) {
			return;
		}
		current[lastIndex] = value;
	} else {
		(current as UnknownRecord)[lastKey] = value;
	}
}
