import { expect, suite, test } from "vitest";

import { isPromise } from "./is-promise.js";

suite("isPromise", () => {
	test("should accept promises", () => {
		expect(isPromise(Promise.resolve())).toBe(true);
		expect(isPromise(new Promise(() => {}))).toBe(true);
	});

	test("should accept the result of an async call", async () => {
		const pending = (async () => 1)();
		expect(isPromise(pending)).toBe(true);
		await pending;
	});

	test("should reject a bare thenable", () => {
		// oxlint-disable-next-line unicorn/no-thenable -- a thenable that is not a Promise is the case this guard exists to tell apart
		expect(isPromise({ then: () => {} })).toBe(false);
	});

	test("should reject other values", () => {
		expect(isPromise(() => {})).toBe(false);
		expect(isPromise({})).toBe(false);
		expect(isPromise(null)).toBe(false);
		expect(isPromise(undefined)).toBe(false);
	});
});
