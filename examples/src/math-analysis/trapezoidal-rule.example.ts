import { trapezoidalRule } from "@ac-kit/math-analysis";

import { curveFrame } from "../_curve.js";
import type { Example, ExampleParams, ExampleParamValues } from "../example.js";

const INTEGRALS = {
	"∫ sin x dx over [0, π]": {
		f: Math.sin,
		lower: 0,
		upper: Math.PI,
		exact: 2,
	},
	"∫ eˣ dx over [0, 1]": {
		f: Math.exp,
		lower: 0,
		upper: 1,
		exact: Math.E - 1,
	},
	"∫ dx/x over [1, 2]": {
		f: (x: number) => 1 / x,
		lower: 1,
		upper: 2,
		exact: Math.LN2,
	},
} as const;

const params = {
	integral: {
		kind: "choice",
		label: "Integral",
		options: [
			"∫ sin x dx over [0, π]",
			"∫ eˣ dx over [0, 1]",
			"∫ dx/x over [1, 2]",
		],
		initial: "∫ sin x dx over [0, π]",
	},
	doublings: {
		kind: "number",
		label: "Doublings of the panel count",
		min: 4,
		max: 24,
		step: 1,
		initial: 18,
		hint: "Past about 2²² the rounding floor is reached and the error stops falling.",
	},
} as const satisfies ExampleParams;

export default {
	title: "The trapezoidal rule is second order",
	description:
		"Replacing the integrand with the straight line across each panel leaves an error of O(h²), so every doubling of the panel count should quarter it. On a log-log axis that is a straight line of slope −2, drawn here against a reference line of exactly that slope. Follow it far enough right and the measured curve leaves the reference: the discretisation error has fallen below the accumulated rounding error, and adding panels stops helping.",
	claim:
		"The error quarters each time the panel count doubles, which is the O(h²) rate.",
	params,
	run({ integral, doublings }: ExampleParamValues<typeof params>) {
		// #region example
		const { f, lower, upper, exact } = INTEGRALS[integral];

		const panels: number[] = [];
		const errors: number[] = [];
		const reference: number[] = [];

		for (let power = 1; power <= doublings; power++) {
			const intervals = 2 ** power;
			const approximation = trapezoidalRule(f, lower, upper, intervals);
			panels.push(intervals);
			errors.push(Math.max(Math.abs(approximation - exact), Number.MIN_VALUE));
			// Anchored at the first measured point, so only the slope is being compared.
			reference.push((errors[0] as number) * (2 / intervals) ** 2);
		}

		const frame = curveFrame(
			panels,
			[
				{ name: "measured error", values: errors },
				{ name: "O(h²) reference", values: reference },
			],
			{ x: "panels", y: "error", series: "quantity" },
		);
		// #endregion

		return {
			kind: "plot",
			frame,
			spec: {
				mark: "line",
				title: `Trapezoidal error for ${integral}`,
				description:
					"Absolute error against panel count on logarithmic axes, with a slope −2 reference line.",
				encoding: {
					x: {
						field: "panels",
						scale: { kind: "log" },
						axis: { title: "panels", grid: true },
					},
					y: {
						field: "error",
						scale: { kind: "log" },
						axis: { title: "absolute error", grid: true },
					},
					color: { field: "quantity", legend: { title: "" } },
				},
			},
		};
	},
} satisfies Example<typeof params>;
