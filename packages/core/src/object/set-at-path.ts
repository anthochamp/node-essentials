import { UnknownRecord } from "type-fest";

import { isObject } from "../guards/is-object.js";
import { PropertyPath } from "./get-at-path.js";
import { isUnsafeRecordKey } from "./is-unsafe-record-key.js";
import { setRecordEntry } from "./set-record-entry.js";

/**
 * Mutates `root` by setting the value at `path`.
 *
 * Creates intermediate plain objects or arrays as needed based on the type of
 * the next key (`number` → array, `string` → object). Existing `null` or
 * `undefined` intermediates are replaced.
 *
 * A path containing `__proto__`, `constructor` or `prototype` is refused
 * outright and nothing is written, because walking one reaches a prototype
 * shared with every other object. The refusal is silent, like the one for a
 * non-numeric index into an array.
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
	if (path.length === 0 || path.some(isUnsafeRecordKey)) {
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
				setRecordEntry(obj, String(key), typeof nextKey === "number" ? [] : {});
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
		setRecordEntry(current as UnknownRecord, String(lastKey), value);
	}
}
