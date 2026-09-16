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
		? mergeInplace_(target, source, options)
		: fromSource_(source, options);
}

/**
 * Merge `source` into `target`, modifying it.
 *
 * Shallow by default: a key present in both takes the source's value whole.
 * With `recursive`, two mergeable values are merged instead — see
 * {@link MergeOptions.recursive} for what that costs.
 *
 * @param target Value to merge into; modified when it is mergeable
 * @param source Value to merge from
 * @param options Merge options
 * @returns `target` where it could be merged into, otherwise the source value
 */
export function mergeInplace<T, U, R extends Merge<T, U>>(
	target: T,
	source: U,
	options?: MergeOptions & { recursive?: false },
): R;
export function mergeInplace<T, U, R extends MergeDeep<T, U>>(
	target: T,
	source: U,
	options: MergeOptions & { recursive: true },
): R;
export function mergeInplace<T, U>(
	target: T,
	source: U,
	options?: MergeOptions,
): unknown {
	return mergeInplace_(target, source, resolve_(options));
}

/**
 * Fold several sources into `target`, each merged over the one before it.
 *
 * Options are resolved once for the whole fold, where a chain of binary
 * {@link mergeInplace} calls resolves them per step.
 *
 * @param target Value to merge into; modified when it is mergeable
 * @param sources Values to merge, lowest priority first
 * @param options Merge options
 * @returns `target` where it could be merged into, otherwise the last value
 *   that replaced it
 */
export function mergeAllInplace<TTarget, TSources extends readonly unknown[]>(
	target: TTarget,
	sources: TSources,
	options?: MergeOptions,
): TTarget & MergedSources<TSources> {
	const resolved = resolve_(options);

	let result: unknown = target;
	for (let index = 0; index < sources.length; index++) {
		result = mergeInplace_(result, sources[index], resolved);
	}

	return result as TTarget & MergedSources<TSources>;
}

function mergeInplace_(
	target: unknown,
	source: unknown,
	options: Resolved_,
): unknown {
	if (isObject(target) && isObject(source)) {
		if (isPojo(target) && isPojo(source)) {
			mergePojoInplace_(target, source, options);
			return target;
		}

		if (isMap(target) && isMap(source)) {
			mergeMapInplace_(target, source, options);
			return target;
		}

		if (isSet(target) && isSet(source)) {
			mergeSetInplace_(target, source, options);
			return target;
		}
	} else if (Array.isArray(target) && Array.isArray(source)) {
		mergeArrayInplace_(target, source, options);
		return target;
	}

	return fromSource_(source, options);
}

function mergePojoInplace_(
	target: Record<string, unknown>,
	source: Record<string, unknown>,
	options: Resolved_,
): void {
	// Own keys only: `for...in` would walk a hostile source's prototype too.
	for (const key of Object.keys(source)) {
		setRecordEntry(target, key, nested_(target[key], source[key], options));
	}
}

function mergeSetInplace_(
	target: Set<unknown>,
	source: Set<unknown>,
	options: Resolved_,
): void {
	for (const value of source) {
		if (!target.has(value)) {
			target.add(fromSource_(value, options));
		}
	}
}

function mergeMapInplace_(
	target: Map<unknown, unknown>,
	source: Map<unknown, unknown>,
	options: Resolved_,
): void {
	for (const [key, value] of source) {
		target.set(key, nested_(target.get(key), value, options));
	}
}

function mergeArrayInplace_(
	target: unknown[],
	source: unknown[],
	options: Resolved_,
): void {
	switch (options.arrayMergeMode) {
		case "spread":
			for (const value of source) {
				target.push(fromSource_(value, options));
			}
			break;

		case "merge":
			for (const [index, sourceValue] of source.entries()) {
				target[index] =
					target[index] === undefined
						? fromSource_(sourceValue, options)
						: nested_(target[index], sourceValue, options);
			}
			break;

		default:
			target.length = 0;
			for (const value of source) {
				target.push(fromSource_(value, options));
			}
			break;
	}
}
