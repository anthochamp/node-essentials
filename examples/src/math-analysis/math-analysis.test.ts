import type { Column } from "@ac-kit/model-dataset";
import { describe, expect, it } from "vitest";

import { itProves, itProvesEveryClaim } from "../_prove.js";
import type { Example, ExampleParams } from "../example.js";
import { exampleInitialValues } from "../example.js";
import beta from "./beta.example.js";
import bisect from "./bisect.example.js";
import continuedFraction from "./continued-fraction-eval.example.js";
import convergenceBudget from "./convergence-budget.example.js";
import erfErfc from "./erf-erfc.example.js";
import gamma from "./gamma.example.js";
import inverseRoundTrip from "./inverse-round-trip.example.js";
import logGammaOverflow from "./log-gamma-overflow.example.js";
import regularizedIncompleteBeta from "./regularized-incomplete-beta.example.js";
import regularizedIncompleteGamma from "./regularized-incomplete-gamma.example.js";
import trapezoidalRule from "./trapezoidal-rule.example.js";

const EXAMPLES: Record<string, Example<ExampleParams>> = {
	beta,
	bisect,
	"continued-fraction-eval": continuedFraction,
	"convergence-budget": convergenceBudget,
	"erf-erfc": erfErfc,
	gamma,
	"inverse-round-trip": inverseRoundTrip,
	"log-gamma-overflow": logGammaOverflow,
	"regularized-incomplete-beta": regularizedIncompleteBeta,
	"regularized-incomplete-gamma": regularizedIncompleteGamma,
	"trapezoidal-rule": trapezoidalRule,
};

function columnValues(column: Column): number[] {
	return Array.from(column as ArrayLike<number>);
}

describe.each(Object.entries(EXAMPLES))("%s", (_name, example) => {
	const view = example.run(exampleInitialValues(example.params));

	it("declares a title and a description", () => {
		expect(example.title.length).toBeGreaterThan(0);
		expect(example.description.length).toBeGreaterThan(0);
	});

	it("initialises every control within its own bounds", () => {
		for (const param of Object.values(example.params)) {
			if (param.kind === "number") {
				expect(param.initial).toBeGreaterThanOrEqual(param.min);
				expect(param.initial).toBeLessThanOrEqual(param.max);
			}
			if (param.kind === "choice") {
				expect(param.options).toContain(param.initial);
			}
		}
	});

	it("produces a plot over a non-empty frame", () => {
		expect(view.kind).toBe("plot");
		if (view.kind !== "plot") {
			return;
		}
		expect(view.frame.rowCount).toBeGreaterThan(0);
		expect(view.frame.columns).toHaveLength(view.frame.fields.length);
		for (const column of view.frame.columns) {
			expect(column).toHaveLength(view.frame.rowCount);
		}
	});

	it("encodes only fields the frame declares", () => {
		if (view.kind !== "plot") {
			return;
		}
		const names = new Set(view.frame.fields.map((field) => field.name));
		for (const encoding of Object.values(view.spec.encoding)) {
			if ("field" in encoding) {
				expect(names).toContain(encoding.field);
			}
		}
	});

	it("describes itself for a reader who cannot see the chart", () => {
		if (view.kind !== "plot") {
			return;
		}
		expect(view.spec.description).toBeTypeOf("string");
	});
});

describe("erf-erfc", () => {
	itProves(erfErfc, () => {
		const view = erfErfc.run({ upper: 20, samples: 400 });
		if (view.kind !== "plot") {
			throw new Error("expected a plot view");
		}

		const tail = columnValues(view.frame.columns[1] as Column);
		const half = tail.length / 2;
		const erfcTail = tail.slice(0, half);
		const naiveTail = tail.slice(half);

		// Past x ~= 6 the subtraction has nothing left to return.
		expect(naiveTail.at(-1)).toBe(0);
		expect(erfcTail.at(-1)).toBeGreaterThan(0);
		expect(erfcTail.at(-1)).toBeLessThan(1e-100);
	});
});

describe("bisect", () => {
	itProves(bisect, () => {
		const view = bisect.run({ target: "x² − 2", steps: 40 });
		if (view.kind !== "plot") {
			throw new Error("expected a plot view");
		}

		const errors = columnValues(view.frame.columns[1] as Column);
		const half = errors.length / 2;
		const measured = errors.slice(0, half);
		const bound = errors.slice(half);

		for (let index = 0; index < measured.length; index++) {
			expect(measured[index]).toBeLessThanOrEqual(
				(bound[index] as number) * 1.000_001,
			);
		}
	});
});

describe("trapezoidal-rule", () => {
	itProves(trapezoidalRule, () => {
		const view = trapezoidalRule.run({
			integral: "∫ eˣ dx over [0, 1]",
			doublings: 10,
		});
		if (view.kind !== "plot") {
			throw new Error("expected a plot view");
		}

		const errors = columnValues(view.frame.columns[1] as Column);
		const measured = errors.slice(0, errors.length / 2);

		for (let index = 1; index < measured.length; index++) {
			const ratio =
				(measured[index - 1] as number) / (measured[index] as number);
			expect(ratio).toBeGreaterThan(3.9);
			expect(ratio).toBeLessThan(4.1);
		}
	});
});

describe("inverse-round-trip", () => {
	itProves(inverseRoundTrip, () => {
		const view = inverseRoundTrip.run({
			family: "gamma",
			a: 3,
			b: 5,
			samples: 100,
		});
		if (view.kind !== "plot") {
			throw new Error("expected a plot view");
		}

		const residuals = columnValues(view.frame.columns[1] as Column);
		for (const residual of residuals) {
			expect(residual).toBeLessThan(1e-12);
		}
	});
});

describe("log-gamma-overflow", () => {
	itProves(logGammaOverflow, () => {
		const view = logGammaOverflow.run({ upper: 300, samples: 500 });
		if (view.kind !== "plot") {
			throw new Error("expected a plot view");
		}

		const values = columnValues(view.frame.columns[1] as Column);
		const half = values.length / 2;
		const direct = values.slice(0, half);
		const viaGamma = values.slice(half);

		expect(direct.every((value) => Number.isFinite(value))).toBe(true);
		// The route through gamma drops out once gamma overflows.
		expect(viaGamma.at(-1)).toBeNaN();
		expect(direct.at(-1)).toBeGreaterThan(1000);
	});
});

itProvesEveryClaim(EXAMPLES);
