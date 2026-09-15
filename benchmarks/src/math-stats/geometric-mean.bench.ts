import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { geometricMean } from "@ac-kit/math-stats";
import { geometricMean as ssGeometricMean } from "simple-statistics";

import {
	closeTo,
	NUMBERS_SAMPLE_SIZE,
	POSITIVE_VALUES,
} from "../__fixtures__/numbers.js";

let logSum = 0;
for (const value of POSITIVE_VALUES) logSum += Math.log(value);
const GEOMETRIC_WANTED = Math.exp(logSum / POSITIVE_VALUES.length);
const SS_GEOMETRIC_WANTED = ssGeometricMean(POSITIVE_VALUES);

durationCondition(
	`Geometric mean — ${NUMBERS_SAMPLE_SIZE.toLocaleString("en-US")} values`,
	() => {
		durationCase(
			"@ac-kit/.geometricMean",
			{ tags: { kind: "js", result: "correct" } },
			() => closeTo(geometricMean(POSITIVE_VALUES), GEOMETRIC_WANTED),
		);
		durationCase(
			"simple-statistics geometricMean (npm)",
			{
				tags: {
					kind: "js",
					result: SS_GEOMETRIC_WANTED === 0 ? "underflows to 0" : "correct",
				},
			},
			() => closeTo(ssGeometricMean(POSITIVE_VALUES), SS_GEOMETRIC_WANTED),
		);
	},
);
