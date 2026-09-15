import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { rootMeanSquare } from "@ac-kit/math-stats";
import { rootMeanSquare as ssRootMeanSquare } from "simple-statistics";

import {
	closeTo,
	NUMBERS_SAMPLE_SIZE,
	POSITIVE_VALUES,
} from "../__fixtures__/numbers.js";

const RMS_WANTED = ssRootMeanSquare(POSITIVE_VALUES);

durationCondition(
	`Quadratic mean (RMS) — ${NUMBERS_SAMPLE_SIZE.toLocaleString("en-US")} values`,
	() => {
		durationCase("@ac-kit/.rootMeanSquare", { tags: { kind: "js" } }, () =>
			closeTo(rootMeanSquare(POSITIVE_VALUES), RMS_WANTED),
		);
		durationCase(
			"simple-statistics rootMeanSquare (npm)",
			{ tags: { kind: "js" } },
			() => closeTo(ssRootMeanSquare(POSITIVE_VALUES), RMS_WANTED),
		);
	},
);
