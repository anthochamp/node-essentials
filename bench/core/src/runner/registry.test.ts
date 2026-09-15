import { beforeEach, describe, expect, it } from "vitest";

import {
	BenchCondition,
	conditionCases,
	conditionChildren,
	drainConditions,
	registerBeforeAll,
	registerCase,
	registerCondition,
} from "./registry.js";

const MEASURE = "duration";

/** Drains the registry and returns its single root condition. */
function drainOne_(): BenchCondition {
	const root = drainConditions()[0];

	if (root === undefined) {
		throw new Error("no condition was registered");
	}

	return root;
}

describe("registerCondition", () => {
	beforeEach(() => {
		drainConditions();
	});

	it("should record cases and nested conditions in one declaration-ordered list", () => {
		registerCondition(MEASURE, "foo", () => {
			registerCase(MEASURE, "a", () => {});
			registerCondition(MEASURE, "bar", () => {
				registerCase(MEASURE, "x", () => {});
			});
			registerCase(MEASURE, "b", () => {});
		});

		const foo = drainOne_();

		expect(foo.entries.map((entry) => entry.kind)).toEqual([
			"case",
			"condition",
			"case",
		]);
		expect(conditionCases(foo).map((c) => c.title)).toEqual(["a", "b"]);
		expect(conditionChildren(foo).map((s) => s.title)).toEqual(["bar"]);
	});

	it("should keep sibling roots in declaration order", () => {
		registerCondition(MEASURE, "first", () => {
			registerCase(MEASURE, "a", () => {});
		});
		registerCondition(MEASURE, "second", () => {
			registerCase(MEASURE, "b", () => {});
		});

		expect(drainConditions().map((root) => root.title)).toEqual([
			"first",
			"second",
		]);
	});

	it("should attach a hook to the innermost open condition", () => {
		const outerHook = () => {};
		const innerHook = () => {};

		registerCondition(MEASURE, "outer", () => {
			registerBeforeAll(outerHook);

			registerCondition(MEASURE, "inner", () => {
				registerBeforeAll(innerHook);
				registerCase(MEASURE, "a", () => {});
			});
		});

		const outer = drainOne_();

		expect(outer.beforeAll).toBe(outerHook);
		expect(conditionChildren(outer)[0]?.beforeAll).toBe(innerHook);
	});

	it("should reject a second hook of the same kind in one condition", () => {
		expect(() => {
			registerCondition(MEASURE, "twice", () => {
				registerBeforeAll(() => {});
				registerBeforeAll(() => {});
			});
		}).toThrow(Error);
	});

	it("should reject a duplicate case title in one condition", () => {
		expect(() => {
			registerCondition(MEASURE, "dup", () => {
				registerCase(MEASURE, "a", () => {});
				registerCase(MEASURE, "a", () => {});
			});
		}).toThrow(Error);
	});

	it("should leave the stack usable after a condition body throws", () => {
		expect(() => {
			registerCondition(MEASURE, "boom", () => {
				throw new Error("boom");
			});
		}).toThrow(Error);

		registerCondition(MEASURE, "after", () => {
			registerCase(MEASURE, "a", () => {});
		});

		expect(drainConditions().map((root) => root.title)).toEqual(["after"]);
	});

	it("should reject a case registered outside a condition of the same measure", () => {
		expect(() => {
			registerCondition(MEASURE, "outer", () => {
				registerCase("jitter", "a", () => {});
			});
		}).toThrow(Error);
	});

	it("should reject a nested condition of a different measure", () => {
		expect(() => {
			registerCondition(MEASURE, "outer", () => {
				registerCondition("jitter", "inner", () => {});
			});
		}).toThrow(Error);
	});
});
