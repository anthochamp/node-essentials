import { gamma, logGamma } from "@ac-kit/math-analysis";
import { linspace } from "@ac-kit/math-scalar";

import { curveFrame } from "../_curve.js";
import type { Example, ExampleParams, ExampleParamValues } from "../example.js";

const params = {
	upper: {
		kind: "number",
		label: "Largest x",
		min: 100,
		max: 400,
		step: 10,
		initial: 300,
		hint: "Γ(x) leaves binary64 at about x = 171.6; ln Γ(x) carries on.",
	},
	samples: {
		kind: "number",
		label: "Samples",
		min: 100,
		max: 1200,
		step: 50,
		initial: 500,
	},
} as const satisfies ExampleParams;

export default {
	title: "Where Γ stops fitting and ln Γ carries on",
	description:
		"Both curves are ln Γ(x): one taken directly from logGamma, one recovered as Math.log(gamma(x)). They agree exactly until gamma(x) overflows to Infinity, at which point the recovered curve becomes Infinity too and stops being plottable. The direct one keeps going for every argument a caller can represent.",
	claim:
		"logGamma stays finite past x ≈ 171.6, where gamma overflows binary64 and Math.log(gamma(x)) becomes Infinity.",
	params,
	run({ upper, samples }: ExampleParamValues<typeof params>) {
		// #region example
		const xs = linspace(2, upper, samples);

		const direct = xs.map((x) => logGamma(x));
		// `Infinity` breaks the line, which is the point: past the overflow there is
		// nothing left to draw.
		const viaGamma = xs.map((x) => {
			const value = Math.log(gamma(x));
			return Number.isFinite(value) ? value : Number.NaN;
		});
		// #endregion

		const frame = curveFrame(
			xs,
			[
				{ name: "logGamma(x)", values: direct },
				{ name: "Math.log(gamma(x))", values: viaGamma },
			],
			{ x: "x", y: "ln Γ(x)", series: "computed by" },
		);

		return {
			kind: "plot",
			frame,
			spec: {
				mark: "line",
				description:
					"ln Γ(x) computed two ways; the route through gamma ends where gamma overflows.",
				encoding: {
					x: { field: "x", axis: { title: "x", grid: true } },
					y: { field: "ln Γ(x)", axis: { title: "ln Γ(x)", grid: true } },
					color: { field: "computed by" },
				},
			},
		};
	},
} satisfies Example<typeof params> as Example<ExampleParams>;
