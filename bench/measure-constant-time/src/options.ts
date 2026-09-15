import { CaseCommonOptions } from "@ac-bench/core/runner";
import { RandomFn } from "@ac-kit/core";

import { DudectOptions } from "./_dudect.js";

export type ConstantTimeConditionOptions = {
	dudect?: Omit<
		DudectOptions,
		"beforeMeasure" | "afterMeasure" | "signal" | "now" | "random"
	> & {
		/**
		 * Source of randomness for the execution-order shuffle. Defaults to a fixed
		 * seed.
		 */
		random?: RandomFn;
	};
};

export type ConstantTimeCaseOptions = CaseCommonOptions;
