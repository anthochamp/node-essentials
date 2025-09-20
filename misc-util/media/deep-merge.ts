import type { MergeDeep } from "type-fest";
import { isObject } from "../is-object.js";
import { isPojo } from "../is-pojo.js";
import { deepClone } from "./deep-clone.js";
import {
	DEEP_MERGE_DEFAULT_OPTIONS,
	type DeepMergeOptions,
} from "./deep-merge-options.js";
import { defaults } from "./defaults.js";

export function deepMerge<T, U, R extends MergeDeep<T, U>>(
	target: T,
	source: U,
	options?: DeepMergeOptions,
): R {
	if (isObject(target) && isObject(source)) {
		if (isPojo(target) && isPojo(source)) {
			return deepMergePojo(target, source, options) as unknown as R;
		}

		if (target instanceof Map && source instanceof Map) {
			return deepMergeMap(target, source, options) as unknown as R;
		}

		if (target instanceof Set && source instanceof Set) {
			return deepMergeSet(target, source, options) as unknown as R;
		}
	} else if (Array.isArray(target) && Array.isArray(source)) {
		return deepMergeArray(target, source, options) as unknown as R;
	}

	const effectiveOptions = defaults(options, DEEP_MERGE_DEFAULT_OPTIONS);

	return (effectiveOptions.cloneSource
		? deepClone(source)
		: source) as unknown as R;
}

export function deepMergePojo<
	T extends Record<string, unknown>,
	U extends Record<string, unknown>,
>(target: T, source: U, options?: DeepMergeOptions): T & U {
	const output: Record<string, unknown> = { ...target };

	for (const key in source) {
		output[key] = deepMerge(target[key], source[key], options);
	}

	return output as T & U;
}

/**
 * Deep merge two sets.
 *
 * @param target Target set to merge into
 * @param source Source set to merge from
 * @param options Merge options
 * @returns The merged set
 */
export function deepMergeSet<T, U extends T>(
	target: Set<T>,
	source: Set<U>,
	options?: DeepMergeOptions,
): Set<T & U> {
	const effectiveOptions = defaults(options, DEEP_MERGE_DEFAULT_OPTIONS);

	const output = new Set(target);

	source.forEach((value) => {
		if (!output.has(value)) {
			output.add(effectiveOptions.cloneSource ? deepClone(value) : value);
		}
	});

	return output as Set<T & U>;
}

/**
 * Deep merge two maps.
 *
 * @param target Target map to merge into
 * @param source Source map to merge from
 * @param options Merge options
 * @returns The merged map
 */
export function deepMergeMap<
	KT,
	KS extends KT,
	T extends Map<KT, unknown>,
	U extends Map<KS, unknown>,
>(target: T, source: U, options?: DeepMergeOptions): Map<KT & KS, unknown> {
	const output = new Map(target);

	for (const [key, value] of source) {
		const targetValue = target.get(key);

		output.set(key, deepMerge(targetValue, value, options));
	}

	return output as Map<KT & KS, unknown>;
}

/**
 * Deep merge two arrays.
 *
 * @param target Target array to merge into
 * @param source Source array to merge from
 * @param options Merge options
 * @returns The merged array
 */
export function deepMergeArray<
	T extends unknown[],
	U extends unknown[],
	O extends DeepMergeOptions,
	R extends O["arrayMergeMode"] extends "spread"
		? MergeDeep<T, U, { arrayMergeMode: "spread" }>
		: O["arrayMergeMode"] extends "merge"
			? MergeDeep<T, U, { arrayMergeMode: "replace" }>
			: U,
>(target: T, source: U, options?: O): R {
	const effectiveOptions = defaults(options, DEEP_MERGE_DEFAULT_OPTIONS);

	if (effectiveOptions.arrayMergeMode === "spread") {
		return [
			...target,
			...(effectiveOptions.cloneSource ? deepClone(source) : source),
		] as unknown as R;
	}

	if (effectiveOptions.arrayMergeMode === "merge") {
		const output = target.slice();

		for (const [index, sourceValue] of source.entries()) {
			const targetValue = target[index];

			if (targetValue === undefined) {
				output[index] = effectiveOptions.cloneSource
					? deepClone(sourceValue)
					: sourceValue;
			} else {
				output[index] = deepMerge(targetValue, sourceValue, options);
			}
		}

		for (let i = source.length; i < target.length; i++) {
			output[i] = deepClone(target[i]);
		}

		return output as unknown as R;
	}

	return (effectiveOptions.cloneSource
		? deepClone(source)
		: source) as unknown as R;
}
