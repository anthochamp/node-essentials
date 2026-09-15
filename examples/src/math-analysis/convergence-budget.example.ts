import { range } from "@ac-kit/core";
import { continuedFractionEval } from "@ac-kit/math-analysis";

import { curveFrame } from "../_curve.js";
import type { Example, ExampleParams, ExampleParamValues } from "../example.js";

const params = {
	budget: {
		kind: "number",
		label: "maxIterations",
		min: 1,
		max: 60,
		step: 1,
		initial: 8,
		hint: "Below about 38 the routine stops early and reports converged: false.",
	},
} as const satisfies ExampleParams;

/** φ = 1 + 1/(1 + 1/(1 + ⋯)), every coefficient equal to 1. */
const GOLDEN_RATIO = {
	numerator: () => 1,
	denominator: () => 1,
};

const PHI = (1 + Math.sqrt(5)) / 2;

export default {
	title: "Running out of iterations",
	description:
		"Every iterative routine here takes a maxIterations budget, and the ones that can report their own progress return a ConvergenceResult rather than throwing. Each point is one budget: the height is how far the answer still is from φ, and the red section is where the routine gave up before meeting its tolerance. The value it returned there is a real best-effort estimate — it is just not the answer.",
	params,
	run({ budget }: ExampleParamValues<typeof params>) {
		// #region example
		const budgets = Array.from(range(1, budget + 1));

		const errors = budgets.map((maxIterations) => {
			const result = continuedFractionEval(GOLDEN_RATIO, { maxIterations });

			// `converged` is what distinguishes "this is the answer" from "this is
			// where I had to stop". Returning the value bare would hide the difference.
			return result.converged
				? Number.NaN
				: Math.max(Math.abs(result.value - PHI), Number.MIN_VALUE);
		});
		// #endregion

		const converged = budgets.map((maxIterations) => {
			const result = continuedFractionEval(GOLDEN_RATIO, { maxIterations });
			return result.converged
				? Math.max(Math.abs(result.value - PHI), Number.MIN_VALUE)
				: Number.NaN;
		});

		const frame = curveFrame(
			budgets,
			[
				{ name: "gave up (converged: false)", values: errors },
				{ name: "met its tolerance", values: converged },
			],
			{ x: "maxIterations", y: "distance from φ", series: "outcome" },
		);

		return {
			kind: "plot",
			frame,
			spec: {
				mark: "point",
				description:
					"Distance from φ against the iteration budget, split by whether the routine reported convergence.",
				encoding: {
					x: {
						field: "maxIterations",
						scale: { kind: "linear" },
						axis: { title: "maxIterations", grid: true },
					},
					y: {
						field: "distance from φ",
						scale: { kind: "log" },
						axis: { title: "distance from φ", grid: true },
					},
					color: { field: "outcome" },
				},
			},
		};
	},
} satisfies Example<typeof params> as Example<ExampleParams>;
