import { beforeEach, describe, expect, it } from "vitest";

import { collectForkUnits } from "./fork-units.js";
import {
	drainConditions,
	registerCondition,
	registerCase,
} from "./registry.js";

const MEASURE = "duration";

function caseTitles_(index: number): string[] {
	const unit = collectForkUnits(drainConditions())[index];

	if (unit === undefined) {
		throw new Error(`no fork unit at index ${index}`);
	}

	return unit.cases.map((benchCase) => benchCase.title);
}

describe("collectForkUnits", () => {
	beforeEach(() => {
		drainConditions();
	});

	it("should treat a condition with no nested condition as one fork unit", () => {
		registerCondition(MEASURE, "flat", () => {
			registerCase(MEASURE, "a", () => {});
			registerCase(MEASURE, "b", () => {});
		});

		const units = collectForkUnits(drainConditions());

		expect(units.map((unit) => unit.titles)).toEqual([["flat"]]);
		expect(units[0]?.cases.map((c) => c.title)).toEqual(["a", "b"]);
	});

	it("should run an enclosing condition's cases inside each of its leaves", () => {
		registerCondition(MEASURE, "outer", () => {
			registerCase(MEASURE, "shared", () => {});
			registerCondition(MEASURE, "with reviver", () => {});
			registerCondition(MEASURE, "without reviver", () => {});
		});

		const units = collectForkUnits(drainConditions());

		expect(units.map((unit) => unit.titles)).toEqual([
			["outer", "with reviver"],
			["outer", "without reviver"],
		]);
		expect(units[0]?.cases.map((c) => c.title)).toEqual(["shared"]);
		expect(units[1]?.cases.map((c) => c.title)).toEqual(["shared"]);
	});

	it("should never run a condition that declares a nested condition on its own", () => {
		registerCondition(MEASURE, "outer", () => {
			registerCondition(MEASURE, "inner", () => {
				registerCase(MEASURE, "inner a", () => {});
			});
			registerCase(MEASURE, "outer b", () => {});
		});

		const units = collectForkUnits(drainConditions());

		expect(units.map((unit) => unit.titles)).toEqual([["outer", "inner"]]);
		expect(units[0]?.cases.map((c) => c.title)).toEqual(["inner a", "outer b"]);
	});

	it("should split an enclosing condition's cases around each leaf's declaration point", () => {
		registerCondition(MEASURE, "outer", () => {
			registerCase(MEASURE, "A", () => {});
			registerCondition(MEASURE, "one", () => {
				registerCase(MEASURE, "X", () => {});
			});
			registerCase(MEASURE, "B", () => {});
			registerCondition(MEASURE, "two", () => {
				registerCase(MEASURE, "Y", () => {});
			});
			registerCase(MEASURE, "C", () => {});
		});

		const roots = drainConditions();
		const units = collectForkUnits(roots);

		expect(units.map((unit) => unit.condition.title)).toEqual(["one", "two"]);
		expect(units[0]?.cases.map((c) => c.title)).toEqual(["A", "X", "B", "C"]);
		expect(units[1]?.cases.map((c) => c.title)).toEqual(["A", "B", "Y", "C"]);
	});

	it("should carry the enclosing conditions, outermost first", () => {
		registerCondition(MEASURE, "outer", () => {
			registerCondition(MEASURE, "middle", () => {
				registerCondition(MEASURE, "inner", () => {
					registerCase(MEASURE, "a", () => {});
				});
			});
		});

		const unit = collectForkUnits(drainConditions())[0];

		expect(unit?.ancestors.map((condition) => condition.title)).toEqual([
			"outer",
			"middle",
		]);
		expect(unit?.titles).toEqual(["outer", "middle", "inner"]);
	});

	it("should index the path by entry position, not by sibling condition position", () => {
		registerCondition(MEASURE, "outer", () => {
			registerCase(MEASURE, "a", () => {});
			registerCase(MEASURE, "b", () => {});
			registerCondition(MEASURE, "inner", () => {});
		});

		expect(collectForkUnits(drainConditions())[0]?.path).toEqual([0, 2]);
	});

	it("should skip a leaf that would run no case at all", () => {
		registerCondition(MEASURE, "outer", () => {
			registerCondition(MEASURE, "inner", () => {});
		});

		expect(collectForkUnits(drainConditions())).toEqual([]);
	});

	it("should assemble the same list regardless of how deep the leaf sits", () => {
		registerCondition(MEASURE, "outer", () => {
			registerCase(MEASURE, "outer case", () => {});
			registerCondition(MEASURE, "middle", () => {
				registerCase(MEASURE, "middle case", () => {});
				registerCondition(MEASURE, "inner", () => {
					registerCase(MEASURE, "inner case", () => {});
				});
			});
		});

		expect(caseTitles_(0)).toEqual(["outer case", "middle case", "inner case"]);
	});
});
