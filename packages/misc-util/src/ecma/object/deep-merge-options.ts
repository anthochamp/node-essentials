export type DeepMergeArrayMergeMode = "replace" | "spread" | "merge";

export type DeepMergeOptions = {
	cloneSource?: boolean; // default: false

	arrayMergeMode?: DeepMergeArrayMergeMode; // default: "replace"
};

export const DEEP_MERGE_DEFAULT_OPTIONS: Required<DeepMergeOptions> = {
	cloneSource: false,
	arrayMergeMode: "replace",
};
