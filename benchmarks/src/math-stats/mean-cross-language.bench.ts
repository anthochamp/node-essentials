import assert from "node:assert";
/**
 * Numpy as an external reference for the one reduction that is worth taking
 * across a process boundary.
 *
 * The array is a million elements and the reduction is repeated, because at the
 * 10 000 element size the rest of this package uses, the comparison would be a
 * comparison of interpreter startup.
 *
 * `util` can only appear here because `mean` accepts an array. The variadic
 * form throws `RangeError` past roughly 100 000 arguments, so it rules out the
 * size at which the cross-language question becomes meaningful.
 */

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { mean } from "@ac-kit/math-stats";
import { spawnProcess } from "@ac-kit/node";
import { mean as d3Mean } from "d3-array";
import { mean as ssMean } from "simple-statistics";

import { crossLanguageMeanGroup } from "./__fixtures__/cross-language.js";

const SIZE = 1_000_000;
const REPEAT = 100;
const KNUTH = 2_654_435_761;

/** The same values the reference program builds, from the same formula. */
function build(count: number): Float64Array {
	const values = new Float64Array(count);
	for (let index = 0; index < count; index++) {
		values[index] = (Math.imul(index, KNUTH) >>> 0) / 0x1_0000_0000;
	}
	return values;
}

const crossLanguage = await crossLanguageMeanGroup();

durationCondition(
	`Mean — ${SIZE} values reduced ${REPEAT} times`,
	{
		spawnBaselines: crossLanguage?.baselines,
		sampling: {
			warmup: 3,
			minRuns: 10,
			maxRuns: 50,
			minTimeMs: 3_000,
			maxTimeMs: 20_000,
		},
	},
	() => {
		const values = build(SIZE);
		const array = Array.from(values);

		let wanted = 0;
		for (let pass = 0; pass < REPEAT; pass++) {
			let sum = 0;
			for (let index = 0; index < values.length; index++) {
				sum += values[index]!;
			}
			wanted = sum / values.length;
		}
		const digits = wanted.toPrecision(10);

		durationCase(
			"@ac-kit/.mean (array)",
			{
				tags: { kind: "js", language: "TypeScript", storage: "array" },
			},
			() => {
				let result = 0;
				for (let pass = 0; pass < REPEAT; pass++) {
					result = mean(array);
				}
				assert.strictEqual(result.toPrecision(10), digits);
			},
		);

		durationCase(
			"hand-written loop over Float64Array",
			{ tags: { kind: "js", language: "JavaScript", storage: "typed array" } },
			() => {
				let result = 0;
				for (let pass = 0; pass < REPEAT; pass++) {
					let sum = 0;
					for (let index = 0; index < values.length; index++) {
						sum += values[index]!;
					}
					result = sum / values.length;
				}
				assert.strictEqual(result.toPrecision(10), digits);
			},
		);

		durationCase(
			"hand-written loop over Array",
			{
				tags: { kind: "js", language: "JavaScript", storage: "array" },
			},
			() => {
				let result = 0;
				for (let pass = 0; pass < REPEAT; pass++) {
					let sum = 0;
					for (let index = 0; index < array.length; index++) {
						sum += array[index]!;
					}
					result = sum / array.length;
				}
				assert.strictEqual(result.toPrecision(10), digits);
			},
		);

		durationCase(
			"simple-statistics mean (npm)",
			{
				tags: { kind: "js", language: "JavaScript", storage: "array" },
			},
			() => {
				let result = 0;
				for (let pass = 0; pass < REPEAT; pass++) {
					result = ssMean(array);
				}
				assert.strictEqual(result.toPrecision(10), digits);
			},
		);

		durationCase(
			"d3-array mean (npm)",
			{
				tags: { kind: "js", language: "JavaScript", storage: "array" },
			},
			() => {
				let result = 0;
				for (let pass = 0; pass < REPEAT; pass++) {
					result = d3Mean(array)!;
				}
				assert.strictEqual(result.toPrecision(10), digits);
			},
		);

		for (const program of crossLanguage?.programs ?? []) {
			durationCase(
				`${program.language} mean`,
				{
					tags: { kind: "native", language: program.language },
				},
				async () => {
					const { stdout } = await spawnProcess(program.command, [
						...program.baseArgs,
						"mean",
						String(SIZE),
						String(REPEAT),
					]);
					assert.strictEqual(Number.parseFloat(stdout).toPrecision(10), digits);
				},
			);
		}
	},
);
