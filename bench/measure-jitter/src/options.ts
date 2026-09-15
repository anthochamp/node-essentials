import { CaseCommonOptions } from "@ac-bench/core/runner";

export type JitterConditionOptions = {
	/** Collections run and discarded first, letting the JIT settle. Defaults to 1. */
	warmup?: number;

	/** Collections whose samples are pooled. Defaults to 3. */
	repeats?: number;
};

export type JitterCaseOptions = CaseCommonOptions;
