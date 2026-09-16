import { afterEach, describe, expect, it } from "vitest";

import { isUnsafeRecordKey } from "./is-unsafe-record-key.js";
import { setRecordEntry } from "./set-record-entry.js";

type Polluted = { polluted?: unknown };

afterEach(() => {
	// A failure here would otherwise poison every later test in the run.
	delete (Object.prototype as Polluted).polluted;
	delete (Array.prototype as Polluted).polluted;
});

describe("setRecordEntry", () => {
	it("should store an ordinary key by assignment", () => {
		const record: Record<string, number> = {};

		setRecordEntry(record, "a", 1);

		expect(record).toStrictEqual({ a: 1 });
	});

	it("should store __proto__ as an own entry without moving the prototype", () => {
		const record: Record<string, unknown> = {};

		setRecordEntry(record, "__proto__", { polluted: "yes" });

		expect(Object.getPrototypeOf(record)).toBe(Object.prototype);
		expect(Object.hasOwn(record, "__proto__")).toBe(true);
		expect(record["__proto__"]).toStrictEqual({ polluted: "yes" });
		expect(({} as Polluted).polluted).toBeUndefined();
	});

	it("should leave a plain assignment of __proto__ demonstrably unsafe", () => {
		const record: Record<string, unknown> = {};

		// The behaviour setRecordEntry exists to avoid.
		record["__proto__"] = { polluted: "yes" };

		expect(Object.hasOwn(record, "__proto__")).toBe(false);
		expect(({} as Polluted).polluted).toBeUndefined();
	});

	it("should overwrite a key it already defined", () => {
		const record: Record<string, string> = {};

		setRecordEntry(record, "__proto__", "first");
		setRecordEntry(record, "__proto__", "second");

		expect(record["__proto__"]).toBe("second");
	});

	it("should store constructor and prototype as ordinary keys", () => {
		const record: Record<string, string> = {};

		setRecordEntry(record, "constructor", "a");
		setRecordEntry(record, "prototype", "b");

		expect(record["constructor"]).toBe("a");
		expect(Object.keys(record)).toStrictEqual(["constructor", "prototype"]);
		expect(({} as Polluted).polluted).toBeUndefined();
	});
});

describe("isUnsafeRecordKey", () => {
	it("should reject every key that reaches a shared prototype", () => {
		expect(isUnsafeRecordKey("__proto__")).toBe(true);
		expect(isUnsafeRecordKey("constructor")).toBe(true);
		expect(isUnsafeRecordKey("prototype")).toBe(true);
	});

	it("should accept a key that merely shadows", () => {
		expect(isUnsafeRecordKey("toString")).toBe(false);
		expect(isUnsafeRecordKey("hasOwnProperty")).toBe(false);
		expect(isUnsafeRecordKey("proto")).toBe(false);
		expect(isUnsafeRecordKey("")).toBe(false);
		expect(isUnsafeRecordKey(0)).toBe(false);
	});
});
