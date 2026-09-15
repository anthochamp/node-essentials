import { compareNaturalAscending } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { bisectRight } from "./bisect-right.js";
import { bisect } from "./bisect.js";

describe("bisect", () => {
	it("should be an alias for bisectRight", () => {
		expect(bisect).toBe(bisectRight);
		expect(bisect([1, 2, 2, 2, 3], 2, compareNaturalAscending)).toBe(4);
	});
});
