import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { mean } from "@ac-kit/math-stats";
import { mean as d3Mean } from "d3-array";
import { mean as ssMean } from "simple-statistics";

import {
	closeTo,
	NUMBERS_SAMPLE_SIZE,
	POSITIVE_VALUES,
} from "../__fixtures__/numbers.js";

const MEAN_WANTED = ssMean(POSITIVE_VALUES);

durationCondition(
	`Mean — ${NUMBERS_SAMPLE_SIZE.toLocaleString("en-US")} values`,
	() => {
		durationCase(
			"@ac-kit/.mean (array)",
			{ tags: { kind: "js", input: "array" } },
			() => closeTo(mean(POSITIVE_VALUES), MEAN_WANTED),
		);
		durationCase(
			"@ac-kit/.mean (spread)",
			{ tags: { kind: "js", input: "variadic" } },
			() => closeTo(mean(...POSITIVE_VALUES), MEAN_WANTED),
		);
		durationCase(
			"hand-written loop",
			{ tags: { kind: "native", input: "array" } },
			() => {
				let sum = 0;
				for (let index = 0; index < POSITIVE_VALUES.length; index++)
					sum += POSITIVE_VALUES[index]!;
				closeTo(sum / POSITIVE_VALUES.length, MEAN_WANTED);
			},
		);
		durationCase(
			"Array.reduce",
			{ tags: { kind: "native", input: "array" } },
			() =>
				closeTo(
					POSITIVE_VALUES.reduce((sum, value) => sum + value, 0) /
						POSITIVE_VALUES.length,
					MEAN_WANTED,
				),
		);
		durationCase(
			"simple-statistics mean (npm)",
			{ tags: { kind: "js", input: "array" } },
			() => closeTo(ssMean(POSITIVE_VALUES), MEAN_WANTED),
		);
		durationCase(
			"d3-array mean (npm)",
			{ tags: { kind: "js", input: "array" } },
			() => closeTo(d3Mean(POSITIVE_VALUES)!, MEAN_WANTED),
		);
	},
);
