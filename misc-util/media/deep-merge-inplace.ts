import type { MergeDeep } from "type-fest";
import { isObject } from "../is-object.js";
import { isPojo } from "../is-pojo.js";
import { deepClone } from "./deep-clone.js";
import {
	DEEP_MERGE_DEFAULT_OPTIONS,
	type DeepMergeOptions,
} from "./deep-merge-options.js";
import { defaults } from "./defaults.js";

export function deepMergeInplace<T, U, R extends MergeDeep<T, U>>(
	target: T,
	source: U,
	options?: DeepMergeOptions,
): R {
	if (isObject(target) && isObject(source)) {
		if (isPojo(target) && isPojo(source)) {
			deepMergePojoInplace(target, source, options);
			return target as unknown as R;
		}

		if (target instanceof Map && source instanceof Map) {
			deepMergeMapInplace(target, source, options);
			return target as unknown as R;
		}

		if (target instanceof Set && source instanceof Set) {
			deepMergeSetInplace(target, source, options);
			return target as unknown as R;
		}
	} else if (Array.isArray(target) && Array.isArray(source)) {
		deepMergeArrayInplace(target, source, options);
		return target as unknown as R;
	}

	const effectiveOptions = defaults(options, DEEP_MERGE_DEFAULT_OPTIONS);

	return (effectiveOptions.cloneSource
		? deepClone(source)
		: source) as unknown as R;
}

export function deepMergePojoInplace(
	target: Record<string, unknown>,
	source: Record<string, unknown>,
	options?: DeepMergeOptions,
): void {
	for (const key in source) {
		target[key] = deepMergeInplace(target[key], source[key], options);
	}
}

/**
 * Deep merge two sets in place.
 *
 * @param target Target set to merge into
 * @param source Source set to merge from
 * @param options Merge options
 */
export function deepMergeSetInplace<T, U extends T>(
	target: Set<T>,
	source: Set<U>,
	options?: DeepMergeOptions,
): void {
	const effectiveOptions = defaults(options, DEEP_MERGE_DEFAULT_OPTIONS);

	for (const value of source) {
		if (!target.has(value)) {
			target.add(effectiveOptions.cloneSource ? deepClone(value) : value);
		}
	}
}

/**
 * Deep merge two maps in place.
 *
 * @param target Target map to merge into
 * @param source Source map to merge from
 * @param options Merge options
 */
export function deepMergeMapInplace<T, U extends T>(
	target: Map<T, unknown>,
	source: Map<U, unknown>,
	options?: DeepMergeOptions,
): void {
	for (const [key, value] of source) {
		const targetValue = target.get(key);

		target.set(key, deepMergeInplace(targetValue, value, options));
	}
}

/**
 * Deep merge two arrays in place.
 *
 * @param target Target array to merge into
 * @param source Source array to merge from
 * @param options Merge options
 */
export function deepMergeArrayInplace(
	target: unknown[],
	source: unknown[],
	options?: DeepMergeOptions,
): void {
	const effectiveOptions = defaults(options, DEEP_MERGE_DEFAULT_OPTIONS);

	switch (effectiveOptions.arrayMergeMode) {
		case "spread":
			target.push(
				...(effectiveOptions.cloneSource ? deepClone(source) : source),
			);
			break;

		case "merge":
			for (const [index, sourceValue] of source.entries()) {
				const targetValue = target[index];

				if (targetValue === undefined) {
					target[index] = effectiveOptions.cloneSource
						? deepClone(sourceValue)
						: sourceValue;
				} else {
					target[index] = deepMergeInplace(targetValue, sourceValue, options);
				}
			}
			break;

		default:
			target.splice(
				0,
				target.length,
				...(effectiveOptions.cloneSource ? deepClone(source) : source),
			);
			break;
	}
}
