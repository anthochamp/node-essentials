import type { Simplify, UnionToIntersection } from "type-fest";

export type MergeArrayMode = "replace" | "spread" | "merge";

export type MergeOptions = {
	/**
	 * Whether to merge nested values recursively, rather than letting the
	 * source's value replace the target's. Defaults to `false`.
	 *
	 * Recursing costs the whole tree rather than the top-level key count.
	 */
	recursive?: boolean; // default: false

	cloneSource?: boolean; // default: false

	arrayMergeMode?: MergeArrayMode; // default: "replace"
};

export const MERGE_DEFAULT_OPTIONS: Required<MergeOptions> = {
	recursive: false,
	cloneSource: false,
	arrayMergeMode: "replace",
};

/**
 * What folding `TSources` yields.
 *
 * An intersection, which is right while the sources' keys are disjoint or agree
 * on a type. Where they disagree the last source wins at runtime, so a caller
 * in that position states the result type itself.
 */
export type MergedSources<TSources extends readonly unknown[]> = Simplify<
	UnionToIntersection<TSources[number]>
>;
