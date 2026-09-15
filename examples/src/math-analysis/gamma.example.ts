import { gamma, logGamma } from "@ac-kit/math-analysis";
import { linspace } from "@ac-kit/math-scalar";

import { curveFrame } from "../_curve.js";
import type { Example, ExampleParams, ExampleParamValues } from "../example.js";

const params = {
	lower: {
		kind: "number",
		label: "Lower bound",
		min: -5,
		max: 0,
		step: 0.25,
		initial: -4,
		hint: "Γ has a pole at every non-positive integer, so the curve breaks there.",
	},
	upper: {
		kind: "number",
		label: "Upper bound",
		min: 1,
		max: 6,
		step: 0.25,
		initial: 5,
	},
	samples: {
		kind: "number",
		label: "Samples",
		min: 50,
		max: 2000,
		step: 50,
		initial: 800,
	},
	scale: {
		kind: "choice",
		label: "Show",
		options: ["Γ(x)", "ln |Γ(x)|", "both"],
		initial: "Γ(x)",
		hint: "logGamma stays finite where gamma overflows binary64 past x ≈ 171.",
	},
} as const satisfies ExampleParams;

/** Half-height of the plotted window. */
const VISIBLE = 6;

/**
 * Drops a sample that leaves the window.
 *
 * `NaN` breaks the line rather than clamping it, which matters either side of a
 * pole: a clamped sample would be joined to the next one and drawn as a
 * vertical asymptote that is an artefact of the sampling, not of the function.
 */
function clip(value: number): number {
	return Math.abs(value) > VISIBLE ? Number.NaN : value;
}

export default {
	title: "The gamma function and its logarithm",
	description:
		"Γ extends the factorial to the reals, with Γ(n) = (n − 1)! at every positive integer. It has a pole at every non-positive integer, where the one-sided limits disagree in sign, so gamma answers NaN there rather than picking one. Drag the bounds across an integer to watch the two branches diverge.",
	params,
	run({ lower, upper, samples, scale }: ExampleParamValues<typeof params>) {
		// #region example
		const xs = linspace(lower, upper, samples);

		const series = [];
		if (scale !== "ln |Γ(x)|") {
			series.push({ name: "Γ(x)", values: xs.map((x) => clip(gamma(x))) });
		}
		if (scale !== "Γ(x)") {
			series.push({
				name: "ln |Γ(x)|",
				values: xs.map((x) => clip(logGamma(x))),
			});
		}

		const frame = curveFrame(xs, series, {
			x: "x",
			y: "value",
			series: "function",
		});
		// #endregion

		return {
			kind: "plot",
			frame,
			spec: {
				mark: "line",
				title: "Γ(x) over the reals",
				description:
					"The gamma function plotted across its poles at the non-positive integers.",
				encoding: {
					x: { field: "x", axis: { title: "x", grid: true } },
					y: {
						field: "value",
						scale: { kind: "linear", domain: [-VISIBLE, VISIBLE] },
						axis: { title: "value", grid: true },
					},
					color: { field: "function", legend: { title: "" } },
				},
			},
		};
	},
} satisfies Example<typeof params>;
