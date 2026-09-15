import {
	inverseRegularizedIncompleteBeta,
	inverseRegularizedIncompleteGamma,
	regularizedIncompleteBeta,
	regularizedIncompleteGamma,
} from "@ac-kit/math-analysis";
import { linspace } from "@ac-kit/math-scalar";

import { curveFrame } from "../_curve.js";
import type { Example, ExampleParams, ExampleParamValues } from "../example.js";

const params = {
	family: {
		kind: "choice",
		label: "Family",
		options: ["gamma", "beta"],
		initial: "gamma",
	},
	a: {
		kind: "number",
		label: "a",
		min: 0.5,
		max: 20,
		step: 0.5,
		initial: 3,
	},
	b: {
		kind: "number",
		label: "b (beta only)",
		min: 0.5,
		max: 20,
		step: 0.5,
		initial: 5,
	},
	samples: {
		kind: "number",
		label: "Samples",
		min: 25,
		max: 500,
		step: 25,
		initial: 200,
	},
} as const satisfies ExampleParams;

export default {
	title: "Round-tripping the quantile functions",
	description:
		"An inverse is only as good as the round trip it survives. Each point takes a probability p, asks the inverse for the x with that cumulative probability, then feeds x back through the forward function and measures how far the answer drifts from p. A few ulps across the whole unit interval is what correct looks like; the residual climbing near the ends is where the forward function's own conditioning gives out, not where the inverse is wrong.",
	claim:
		"Inverting a probability and evaluating it back agrees with the input to better than 1e-12.",
	params,
	run({ family, a, b, samples }: ExampleParamValues<typeof params>) {
		// #region example
		// Endpoints excluded: p = 0 and p = 1 map to the domain's own boundaries.
		const ps = linspace(0.001, 0.999, samples);

		const residuals = ps.map((p) => {
			const x =
				family === "gamma"
					? inverseRegularizedIncompleteGamma(a, p)
					: inverseRegularizedIncompleteBeta(a, b, p);
			const back =
				family === "gamma"
					? regularizedIncompleteGamma(a, x)
					: regularizedIncompleteBeta(a, b, x);
			return Math.max(Math.abs(back - p), Number.MIN_VALUE);
		});

		const frame = curveFrame(
			ps,
			[{ name: "|P(inverse(p)) − p|", values: residuals }],
			{ x: "p", y: "residual", series: "quantity" },
		);
		// #endregion

		return {
			kind: "plot",
			frame,
			spec: {
				mark: "line",
				title: `Round-trip residual, ${family} family`,
				description:
					"Absolute round-trip error of the quantile function across the unit interval.",
				encoding: {
					x: {
						field: "p",
						scale: { kind: "linear", domain: [0, 1] },
						axis: { title: "p", grid: true },
					},
					y: {
						field: "residual",
						scale: { kind: "log" },
						axis: { title: "absolute residual", grid: true },
					},
					color: { field: "quantity", legend: { hidden: true } },
				},
			},
		};
	},
} satisfies Example<typeof params>;
