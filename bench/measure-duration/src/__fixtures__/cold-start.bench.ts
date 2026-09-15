import { durationCase, durationCondition } from "../index.js";

durationCondition(
	"cold start",
	{
		sampling: {
			warmup: 1,
			minRuns: 3,
			maxRuns: 3,
			minTimeMs: 0,
			maxTimeMs: 60_000,
			relativeError: "off",
		},
	},
	() => {
		durationCase("empty", { execution: "per-iteration-process" }, () => {});
	},
);
