import { erf, erfc } from "@ac-kit/math-analysis";
import { linspace } from "@ac-kit/math-scalar";

import { curveFrame } from "../_curve.js";
import type { Example, ExampleParams, ExampleParamValues } from "../example.js";

const params = {
	upper: {
		kind: "number",
		label: "Largest x",
		min: 2,
		max: 27,
		step: 0.5,
		initial: 10,
		hint: "Push past 6 to watch the naive curve fall off the axis entirely.",
	},
	samples: {
		kind: "number",
		label: "Samples",
		min: 50,
		max: 1500,
		step: 50,
		initial: 600,
	},
} as const satisfies ExampleParams;

export default {
	title: "Why erfc is not 1 − erf",
	description:
		"Both curves are the same mathematical quantity, plotted on a logarithmic axis. The naive 1 − erf(x) dies at x ≈ 6, where erf(x) rounds to exactly 1 and the subtraction returns exactly 0 — there is nothing left to take a logarithm of, so its line simply ends. erfc(x) routes the positive branch through the upper incomplete gamma instead and keeps full relative precision down to the underflow limit near x = 26.5. That gap is what makes a normal tail probability of 1e-100 computable at all.",
	claim:
		"Past x ≈ 6 the naive 1 − erf(x) returns exactly zero, while erfc(x) stays positive below 1e-100.",
	params,
	run({ upper, samples }: ExampleParamValues<typeof params>) {
		// #region example
		const xs = linspace(0, upper, samples);

		const frame = curveFrame(
			xs,
			[
				{ name: "erfc(x)", values: xs.map((x) => erfc(x)) },
				{ name: "1 − erf(x)", values: xs.map((x) => 1 - erf(x)) },
			],
			{ x: "x", y: "tail", series: "method" },
		);
		// #endregion

		return {
			kind: "plot",
			frame,
			spec: {
				mark: "line",
				title: "The Gaussian tail, computed two ways",
				description:
					"erfc against 1 − erf on a logarithmic axis; the naive form reaches zero near x = 6 and cannot be plotted beyond it.",
				encoding: {
					x: { field: "x", axis: { title: "x", grid: true } },
					y: {
						field: "tail",
						scale: { kind: "log" },
						axis: { title: "tail probability", grid: true },
					},
					color: { field: "method", legend: { title: "" } },
				},
			},
		};
	},
} satisfies Example<typeof params>;
