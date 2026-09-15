import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { harmonicMean } from "@ac-kit/math-stats";
import { harmonicMean as ssHarmonicMean } from "simple-statistics";

import {
	closeTo,
	NUMBERS_SAMPLE_SIZE,
	POSITIVE_VALUES,
} from "../__fixtures__/numbers.js";

const HARMONIC_WANTED = ssHarmonicMean(POSITIVE_VALUES);

durationCondition(
	`Harmonic mean — ${NUMBERS_SAMPLE_SIZE.toLocaleString("en-US")} values`,
	() => {
		durationCase("@ac-kit/.harmonicMean", { tags: { kind: "js" } }, () =>
			closeTo(harmonicMean(POSITIVE_VALUES), HARMONIC_WANTED),
		);
		durationCase(
			"simple-statistics harmonicMean (npm)",
			{ tags: { kind: "js" } },
			() => closeTo(ssHarmonicMean(POSITIVE_VALUES), HARMONIC_WANTED),
		);
	},
);
