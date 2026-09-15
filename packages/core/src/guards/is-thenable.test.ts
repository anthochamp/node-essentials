import { describe, expect, it } from "vitest";

import { isThenable } from "./is-thenable.js";

describe("isThenable", () => {
	it("should accept a promise", () => {
		expect(isThenable(Promise.resolve(1))).toBe(true);
	});

	it("should accept a foreign thenable", () => {
		// oxlint-disable-next-line unicorn/no-thenable
		expect(isThenable({ then: () => {} })).toBe(true);
	});

	it("should reject a value whose then is not callable", () => {
		// oxlint-disable-next-line unicorn/no-thenable
		expect(isThenable({ then: 1 })).toBe(false);
	});

	it("should reject values that cannot be awaited meaningfully", () => {
		expect(isThenable(undefined)).toBe(false);
		expect(isThenable(null)).toBe(false);
		expect(isThenable(42)).toBe(false);
		expect(isThenable("then")).toBe(false);
		expect(isThenable({})).toBe(false);
	});

	it("should reject a function, even an async one", () => {
		// The call's result is thenable; the function itself is not.
		expect(isThenable(async () => {})).toBe(false);
	});
});
