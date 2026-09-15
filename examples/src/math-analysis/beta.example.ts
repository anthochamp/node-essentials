import { beta, logBeta } from "@ac-kit/math-analysis";
import { linspace } from "@ac-kit/math-scalar";

import { curveFrame } from "../_curve.js";
import type { Example, ExampleParams, ExampleParamValues } from "../example.js";

const params = {
	b: {
		kind: "number",
		label: "b",
		min: 0.5,
		max: 50,
		step: 0.5,
		initial: 3,
	},
	upper: {
		kind: "number",
		label: "Largest a",
		min: 10,
		max: 400,
		step: 10,
		initial: 180,
		hint: "B(a, b) underflows to zero long before ln B(a, b) runs out of range.",
	},
	samples: {
		kind: "number",
		label: "Samples",
		min: 50,
		max: 800,
		step: 25,
		initial: 400,
	},
} as const satisfies ExampleParams;

export default {
	title: "B(a, b) underflows where ln B(a, b) does not",
	description:
		"The beta function decays so fast that binary64 cannot hold it: B(a, b) reaches the underflow limit and becomes exactly zero, taking every digit with it. logBeta is not a convenience wrapper around the logarithm of beta(a, b) — it is computed through logGamma directly, so it keeps full relative precision across the whole range. Both curves are plotted as ln B so they are comparable, and the second one falls off a cliff.",
	params,
	run({ b, upper, samples }: ExampleParamValues<typeof params>) {
		// #region example
		const as = linspace(1, upper, samples);

		const frame = curveFrame(
			as,
			[
				{ name: "logBeta(a, b)", values: as.map((a) => logBeta(a, b)) },
				{
					name: "Math.log(beta(a, b))",
					values: as.map((a) => Math.log(beta(a, b))),
				},
			],
			{ x: "a", y: "logValue", series: "method" },
		);
		// #endregion

		return {
			kind: "plot",
			frame,
			spec: {
				mark: "line",
				title: `ln B(a, ${b}) computed two ways`,
				description:
					"The direct logarithm against the logarithm of the underflowing product.",
				encoding: {
					x: { field: "a", axis: { title: "a", grid: true } },
					y: { field: "logValue", axis: { title: "ln B(a, b)", grid: true } },
					color: { field: "method", legend: { title: "" } },
				},
			},
		};
	},
} satisfies Example<typeof params>;
