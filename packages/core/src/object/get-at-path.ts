import { UnknownRecord } from "type-fest";

import { isObject } from "../guards/is-object.js";

/**
 * A path into a nested object/array — segments are string keys or numeric
 * indices.
 */
export type PropertyPath = readonly (string | number)[];

/**
 * Gets the value at `path` inside `root`.
 *
 * Unlike `setAtPath`, this does not refuse a path through `__proto__`,
 * `constructor` or `prototype`: reading one hands back a prototype the caller
 * could already reach through any object it holds, so refusing it would cost an
 * honest lookup and prevent nothing.
 *
 * @param root The root object/array to traverse
 * @param path The path to traverse
 * @returns The value at the path, or `undefined` if the path does not exist.
 */
export function getAtPath(root: unknown, path: PropertyPath): unknown {
	let current = root;

	for (const key of path) {
		if (Array.isArray(current)) {
			const index = +key;
			if (Number.isNaN(index)) {
				return;
			}
			current = current[index];
		} else if (isObject(current)) {
			current = (current as UnknownRecord)[key];
		} else {
			return;
		}
	}

	return current;
}
