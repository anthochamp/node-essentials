import type { Merge, MergeDeep } from "type-fest";

import { isMap } from "../guards/is-map.js";
import { isObject } from "../guards/is-object.js";
import { isPojo } from "../guards/is-pojo.js";
import { isSet } from "../guards/is-set.js";
import { clone } from "./clone.js";
import {
	MERGE_DEFAULT_OPTIONS,
	type MergedSources,
	type MergeOptions,
} from "./merge-options.js";
import { setRecordEntry } from "./set-record-entry.js";

type Resolved_ = Required<MergeOptions>;

function resolve_(options: MergeOptions | undefined): Resolved_ {
	return {
		recursive: options?.recursive ?? MERGE_DEFAULT_OPTIONS.recursive,
		cloneSource: options?.cloneSource ?? MERGE_DEFAULT_OPTIONS.cloneSource,
		arrayMergeMode:
			options?.arrayMergeMode ?? MERGE_DEFAULT_OPTIONS.arrayMergeMode,
	};
}

function fromSource_(value: unknown, options: Resolved_): unknown {
	return options.cloneSource ? clone(value, { recursive: true }) : value;
}

/** A nested pair recurses only when asked; otherwise the source value wins. */
function nested_(
	target: unknown,
	source: unknown,
	options: Resolved_,
): unknown {
	return options.recursive
		? merge_(target, source, options)
		: fromSource_(source, options);
}

/**
 * Merge two values into a new one.
 *
 * Shallow by default: a key present in both takes the source's value whole.
 * With `recursive`, two mergeable values are merged instead — see
 * {@link MergeOptions["recursive"]} for what that costs.
 *
 * @param target Value to merge into
 * @param source Value to merge from
 * @param options Merge options
 * @returns The merged value; `target` is not modified
 */
export function merge<T, U, R extends Merge<T, U>>(
	target: T,
	source: U,
	options?: MergeOptions & { recursive?: false },
): R;
export function merge<T, U, R extends MergeDeep<T, U>>(
	target: T,
	source: U,
	options: MergeOptions & { recursive: true },
): R;
export function merge<T, U>(
	target: T,
	source: U,
	options?: MergeOptions,
): unknown {
	return merge_(target, source, resolve_(options));
}

/**
 * Fold several sources into one value, each merged over the one before it.
 *
 * Options are resolved once for the whole fold, where a chain of binary
 * {@link merge} calls resolves them per step.
 *
 * @param sources Values to merge, lowest priority first
 * @param options Merge options
 * @returns A new value; no source is modified
 */
export function mergeAll<TSources extends readonly unknown[]>(
	sources: TSources,
	options?: MergeOptions,
): MergedSources<TSources> {
	const resolved = resolve_(options);

	let result: unknown = {};
	for (let index = 0; index < sources.length; index++) {
		result = merge_(result, sources[index], resolved);
	}

	return result as MergedSources<TSources>;
}

function merge_(target: unknown, source: unknown, options: Resolved_): unknown {
	if (isObject(target) && isObject(source)) {
		if (isPojo(target) && isPojo(source)) {
			return mergePojo_(target, source, options);
		}

		if (isMap(target) && isMap(source)) {
			return mergeMap_(target, source, options);
		}

		if (isSet(target) && isSet(source)) {
			return mergeSet_(target, source, options);
		}
	} else if (Array.isArray(target) && Array.isArray(source)) {
		return mergeArray_(target, source, options);
	}

	return fromSource_(source, options);
}

function mergePojo_(
	target: Record<string, unknown>,
	source: Record<string, unknown>,
	options: Resolved_,
): Record<string, unknown> {
	const output: Record<string, unknown> = { ...target };

	// Own keys only: `for...in` would walk a hostile source's prototype too.
	for (const key of Object.keys(source)) {
		setRecordEntry(output, key, nested_(target[key], source[key], options));
	}

	return output;
}

function mergeSet_(
	target: Set<unknown>,
	source: Set<unknown>,
	options: Resolved_,
): Set<unknown> {
	const output = new Set(target);

	for (const value of source) {
		if (!output.has(value)) {
			output.add(fromSource_(value, options));
		}
	}

	return output;
}

function mergeMap_(
	target: Map<unknown, unknown>,
	source: Map<unknown, unknown>,
	options: Resolved_,
): Map<unknown, unknown> {
	const output = new Map(target);

	for (const [key, value] of source) {
		output.set(key, nested_(target.get(key), value, options));
	}

	return output;
}

function mergeArray_(
	target: unknown[],
	source: unknown[],
	options: Resolved_,
): unknown[] {
	if (options.arrayMergeMode === "spread") {
		return [...target, ...(fromSource_(source, options) as unknown[])];
	}

	if (options.arrayMergeMode === "merge") {
		const output = target.slice();

		for (const [index, sourceValue] of source.entries()) {
			output[index] =
				target[index] === undefined
					? fromSource_(sourceValue, options)
					: nested_(target[index], sourceValue, options);
		}

		// Anything the source did not reach is copied, so the result shares no
		// reference with the target it was built from.
		for (let index = source.length; index < target.length; index++) {
			output[index] = clone(target[index], { recursive: true });
		}

		return output;
	}

	return fromSource_(source, options) as unknown[];
}
