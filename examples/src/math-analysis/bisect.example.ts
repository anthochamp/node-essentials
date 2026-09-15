import { bisect } from "@ac-kit/math-analysis";

import { curveFrame } from "../_curve.js";
import type { Example, ExampleParams, ExampleParamValues } from "../example.js";

const FUNCTIONS = {
	"x² − 2": {
		f: (x: number) => x * x - 2,
		lower: 0,
		upper: 2,
		root: Math.SQRT2,
	},
	"cos x − x": {
		f: (x: number) => Math.cos(x) - x,
		lower: 0,
		upper: 1,
		root: 0.739_085_133_215_160_6,
	},
	"x³ − x − 2": {
		f: (x: number) => x * x * x - x - 2,
		lower: 1,
		upper: 2,
		root: 1.521_379_706_804_567_6,
	},
} as const;

const params = {
	target: {
		kind: "choice",
		label: "Function",
		options: ["x² − 2", "cos x − x", "x³ − x − 2"],
		initial: "x² − 2",
	},
	steps: {
		kind: "number",
		label: "Iteration budget",
		min: 4,
		max: 60,
		step: 1,
		initial: 52,
		hint: "Binary64 runs out of bits around 52 halvings; the curve floors there.",
	},
} as const satisfies ExampleParams;

export default {
	title: "Bisection converges one bit per iteration",
	description:
		"Each step halves the bracket, so the error after n steps is at most (upper − lower) / 2ⁿ. On a logarithmic axis that is a straight line, and its slope is the whole character of the method: linear convergence, but unconditionally reliable. The intermediate value theorem guarantees a root inside a sign-changing bracket, and bisection can never leave it — which is why it is the default here despite Newton's method being asymptotically faster and capable of diverging.",
	claim:
		"The error after n steps never exceeds the bracket-halving bound (upper − lower) / 2ⁿ.",
	params,
	run({ target, steps }: ExampleParamValues<typeof params>) {
		// #region example
		const { f, lower, upper, root } = FUNCTIONS[target];

		const iterations: number[] = [];
		const errors: number[] = [];
		const bound: number[] = [];

		for (let n = 1; n <= steps; n++) {
			const estimate = bisect(f, lower, upper, {
				maxIterations: n,
				tolerance: 0,
			});
			iterations.push(n);
			// Floored at one ulp: an exact hit has no logarithm to plot.
			errors.push(Math.max(Math.abs(estimate - root), Number.MIN_VALUE));
			bound.push((upper - lower) / 2 ** n);
		}

		const frame = curveFrame(
			iterations,
			[
				{ name: "measured error", values: errors },
				{ name: "(b − a) / 2ⁿ", values: bound },
			],
			{ x: "iteration", y: "error", series: "quantity" },
		);
		// #endregion

		return {
			kind: "plot",
			frame,
			spec: {
				mark: "line",
				title: `Bisection error on ${target}`,
				description:
					"Absolute error against iteration count, with the theoretical bracket-halving bound.",
				encoding: {
					x: { field: "iteration", axis: { title: "iteration", grid: true } },
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
