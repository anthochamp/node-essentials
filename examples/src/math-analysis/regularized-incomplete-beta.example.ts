import { regularizedIncompleteBeta } from "@ac-kit/math-analysis";
import { linspace } from "@ac-kit/math-scalar";

import { curveFrame } from "../_curve.js";
import type { Example, ExampleParams, ExampleParamValues } from "../example.js";

const params = {
	a: {
		kind: "number",
		label: "a",
		min: 0.5,
		max: 10,
		step: 0.5,
		initial: 2,
	},
	b: {
		kind: "number",
		label: "b",
		min: 0.5,
		max: 10,
		step: 0.5,
		initial: 5,
		hint: "a = b is symmetric about x = 0.5; pulling them apart skews the rise.",
	},
	spread: {
		kind: "number",
		label: "Sibling curves",
		min: 1,
		max: 6,
		step: 1,
		initial: 4,
		hint: "Draws b, 2b, 3b … alongside the chosen pair.",
	},
	samples: {
		kind: "number",
		label: "Samples",
		min: 50,
		max: 800,
		step: 25,
		initial: 300,
	},
} as const satisfies ExampleParams;

export default {
	title: "The regularized incomplete beta function",
	description:
		"I(a, b; x) is the beta distribution's cumulative function, and through it Student's t, the F distribution and the binomial tail. It is evaluated by a continued fraction rather than by its defining integral, with the identity I(a, b; x) = 1 − I(b, a; 1 − x) used to pick whichever side converges quickly — the fraction is slow exactly where the reflected one is fast.",
	params,
	run({ a, b, spread, samples }: ExampleParamValues<typeof params>) {
		// #region example
		const xs = linspace(0, 1, samples);

		const series = [];
		for (let multiple = 1; multiple <= spread; multiple++) {
			const shape = b * multiple;
			series.push({
				name: `b = ${shape}`,
				values: xs.map((x) => regularizedIncompleteBeta(a, shape, x)),
			});
		}

		const frame = curveFrame(xs, series, {
			x: "x",
			y: "probability",
			series: "shape",
		});
		// #endregion

		return {
			kind: "plot",
			frame,
			spec: {
				mark: "line",
				title: `I(${a}, b; x)`,
				description:
					"Regularized incomplete beta curves over the unit interval, one per second shape parameter.",
				encoding: {
					x: {
						field: "x",
						scale: { kind: "linear", domain: [0, 1] },
						axis: { title: "x", grid: true },
					},
					y: {
						field: "probability",
						scale: { kind: "linear", domain: [0, 1] },
						axis: { title: "I(a, b; x)", grid: true },
					},
					color: {
						field: "shape",
						scale: {
							kind: "ordinal",
							scheme: { kind: "sequential", name: "viridis" },
						},
						legend: { title: "shape" },
					},
				},
			},
		};
	},
} satisfies Example<typeof params>;
