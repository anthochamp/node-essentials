import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { median } from "@ac-kit/math-stats";
import { median as d3Median } from "d3-array";
import { median as ssMedian } from "simple-statistics";

import {
	closeTo,
	NUMBERS_SAMPLE_SIZE,
	POSITIVE_VALUES,
	SORTED_POSITIVE_VALUES,
} from "../__fixtures__/numbers.js";

const MEDIAN_WANTED = ssMedian(POSITIVE_VALUES);

durationCondition(
	`Median — ${NUMBERS_SAMPLE_SIZE.toLocaleString("en-US")} values`,
	() => {
		durationCase(
			"@ac-kit/.median (array)",
			{ tags: { kind: "js", input: "array" } },
			() => closeTo(median(POSITIVE_VALUES), MEDIAN_WANTED),
		);
		durationCase(
			"@ac-kit/.median (spread)",
			{ tags: { kind: "js", input: "variadic" } },
			() => closeTo(median(...POSITIVE_VALUES), MEDIAN_WANTED),
		);
		durationCase(
			"sort a copy and index",
			{ tags: { kind: "native", input: "array" } },
			() => {
				const sorted = POSITIVE_VALUES.slice().sort((a, b) => a - b);
				const middle = sorted.length >> 1;
				const value =
					sorted.length % 2 === 0
						? (sorted[middle - 1]! + sorted[middle]!) / 2
						: sorted[middle]!;
				closeTo(value, MEDIAN_WANTED);
			},
		);
		durationCase(
			"index an already sorted array",
			{ tags: { kind: "native", input: "presorted" } },
			() => {
				const middle = SORTED_POSITIVE_VALUES.length >> 1;
				const value =
					SORTED_POSITIVE_VALUES.length % 2 === 0
						? (SORTED_POSITIVE_VALUES[middle - 1]! +
								SORTED_POSITIVE_VALUES[middle]!) /
							2
						: SORTED_POSITIVE_VALUES[middle]!;
				closeTo(value, MEDIAN_WANTED);
			},
		);
		durationCase(
			"simple-statistics median (npm)",
			{ tags: { kind: "js", input: "array" } },
			() => closeTo(ssMedian(POSITIVE_VALUES), MEDIAN_WANTED),
		);
		durationCase(
			"d3-array median (npm)",
			{ tags: { kind: "js", input: "array" } },
			() => closeTo(d3Median(POSITIVE_VALUES)!, MEDIAN_WANTED),
		);
	},
);
