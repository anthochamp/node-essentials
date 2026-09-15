import { describe, expect, it } from "vitest";

import { dataFrameFromColumns, dataFrameFromRows } from "./data-frame.js";

// Every value published in an `@example` block, pinned.
describe("documented examples", () => {
	it("dataFrameFromRows", () => {
		const frame = dataFrameFromRows(
			[
				{ name: "city", kind: "nominal" },
				{ name: "population", kind: "quantitative" },
			],
			[
				["Lyon", 522_250],
				["Nantes", 320_732],
			],
		);
		expect(frame.rowCount).toBe(2);
	});

	it("dataFrameFromColumns", () => {
		const frame = dataFrameFromColumns(
			[
				{ name: "x", kind: "quantitative" },
				{ name: "y", kind: "quantitative" },
			],
			[Float64Array.from([0, 1, 2]), Float64Array.from([0, 1, 4])],
		);
		expect(frame.rowCount).toBe(3);
	});
});
