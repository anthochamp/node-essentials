import type { ContinuedFraction } from "@ac-kit/math-analysis";
import { continuedFractionEval } from "@ac-kit/math-analysis";

import { curveFrame } from "../_curve.js";
import type { Example, ExampleParams, ExampleParamValues } from "../example.js";

const FRACTIONS = {
	"φ (golden ratio)": {
		fraction: { numerator: () => 1, denominator: () => 1 },
		exact: (1 + Math.sqrt(5)) / 2,
	},
	"√2": {
		fraction: {
			numerator: () => 1,
			denominator: (index: number) => (index === 0 ? 1 : 2),
		},
		exact: Math.SQRT2,
	},
	"4/π (Brouncker)": {
		fraction: {
			numerator: (index: number) => (2 * index - 1) ** 2,
			denominator: (index: number) => (index === 0 ? 0 : 2),
		},
		exact: 4 / Math.PI,
	},
} as const satisfies Record<
	string,
	{ fraction: ContinuedFraction; exact: number }
>;

const params = {
	fraction: {
		kind: "choice",
		label: "Fraction",
		options: ["φ (golden ratio)", "√2", "4/π (Brouncker)"],
		initial: "φ (golden ratio)",
		hint: "Brouncker's fraction for π is famously slow — hundreds of terms for a handful of digits.",
	},
	terms: {
		kind: "number",
		label: "Iteration budget",
		min: 2,
		max: 300,
		step: 1,
		initial: 60,
	},
} as const satisfies ExampleParams;

export default {
	title: "How fast a continued fraction converges",
	description:
		"Lentz's method works forwards from b₀, so it needs no guess at where to truncate: each step multiplies the running value by a factor tending to 1, and the iteration stops when that factor is within tolerance of 1. The backward evaluation it replaces has to pick a depth up front and re-run the whole fraction when the pick was too shallow. Compare the three fractions — the periodic ones converge geometrically, Brouncker's crawls.",
	params,
	run({ fraction, terms }: ExampleParamValues<typeof params>) {
		// #region example
		const { fraction: coefficients, exact } = FRACTIONS[fraction];

		const budgets: number[] = [];
		const errors: number[] = [];

		for (let budget = 1; budget <= terms; budget++) {
			const result = continuedFractionEval(coefficients, {
				maxIterations: budget,
				tolerance: 0,
			});
			budgets.push(budget);
			errors.push(Math.max(Math.abs(result.value - exact), Number.MIN_VALUE));
		}

		const frame = curveFrame(
			budgets,
			[{ name: "absolute error", values: errors }],
			{ x: "terms", y: "error", series: "quantity" },
		);
		// #endregion

		return {
			kind: "plot",
			frame,
			spec: {
				mark: "line",
				title: `Convergence of ${fraction}`,
				description:
					"Absolute error against the number of terms evaluated, on a logarithmic axis.",
				encoding: {
					x: { field: "terms", axis: { title: "terms", grid: true } },
					y: {
						field: "error",
						scale: { kind: "log" },
						axis: { title: "absolute error", grid: true },
					},
					color: { field: "quantity", legend: { hidden: true } },
				},
			},
		};
	},
} satisfies Example<typeof params>;
