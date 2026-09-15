import {
	regularizedIncompleteGamma,
	regularizedIncompleteGammaUpper,
} from "@ac-kit/math-analysis";
import { linspace } from "@ac-kit/math-scalar";

import { curveFrame } from "../_curve.js";
import type { Example, ExampleParams, ExampleParamValues } from "../example.js";

const params = {
	shapes: {
		kind: "number",
		label: "How many shape parameters",
		min: 1,
		max: 8,
		step: 1,
		initial: 5,
		hint: "One curve per a, from a = 1 upwards.",
	},
	upper: {
		kind: "number",
		label: "Largest x",
		min: 2,
		max: 30,
		step: 1,
		initial: 15,
	},
	branch: {
		kind: "choice",
		label: "Branch",
		options: ["lower P(a, x)", "upper Q(a, x)"],
		initial: "lower P(a, x)",
		hint: "P + Q = 1 exactly in exact arithmetic; each is accurate where the other is not.",
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
	title: "The regularized incomplete gamma family",
	description:
		"P(a, x) is the chi-squared and Poisson cumulative distribution in disguise: it rises from 0 to 1 as x sweeps the domain, with the shape parameter a setting where the rise happens. Q = 1 − P is the survival function. Both names spell out 'regularized' because libraries disagree about whether the bare name means this ratio in [0, 1] or the unnormalised integral — and the argument order puts the parameter first and the variable last, so this family and the beta family read the same way.",
	params,
	run({ shapes, upper, branch, samples }: ExampleParamValues<typeof params>) {
		// #region example
		const xs = linspace(0, upper, samples);
		const evaluate =
			branch === "lower P(a, x)"
				? regularizedIncompleteGamma
				: regularizedIncompleteGammaUpper;

		const series = [];
		for (let a = 1; a <= shapes; a++) {
			series.push({
				name: `a = ${a}`,
				values: xs.map((x) => evaluate(a, x)),
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
				title: `${branch} for a = 1…${shapes}`,
				description:
					"A family of regularized incomplete gamma curves, one per shape parameter.",
				encoding: {
					x: { field: "x", axis: { title: "x", grid: true } },
					y: {
						field: "probability",
						scale: { kind: "linear", domain: [0, 1] },
						axis: { title: branch, grid: true },
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
