import { describe, expect, it } from "vitest";
import { resolveModule } from "./resolve-module.js";

describe("isModuleResolvable", () => {
	it("should return true for existing modules", () => {
		expect(resolveModule("fs")).toBe("fs");
		expect(resolveModule("path")).toBe("path");
		expect(resolveModule("node:os")).toBe("node:os");
		expect(resolveModule("vitest")).not.toBe(null);
	});

	it("should return false for non-existing modules", () => {
		expect(resolveModule("non-existing-module")).toBe(null);
		expect(resolveModule("another-non-existing-module")).toBe(null);
		expect(resolveModule("jest")).toBe(null);
	});
});
