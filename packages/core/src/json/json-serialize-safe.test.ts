import { expect, suite, test } from "vitest";

import { jsonSerializeSafe } from "./json-serialize-safe.js";

suite("jsonSerializeSafe", () => {
	test("should serialize a simple object to a value, not a string", () => {
		const obj = { a: 1, b: "test", c: true };
		expect(jsonSerializeSafe(obj)).toEqual(obj);
	});

	test("should replace circular references with a placeholder", () => {
		const obj: { a: number; self?: unknown } = { a: 1 };
		obj.self = obj;

		expect(jsonSerializeSafe(obj)).toEqual({ a: 1, self: "[Circular]" });
	});

	test("should convert BigInt to a number when within the safe integer range", () => {
		expect(jsonSerializeSafe({ big: 10n })).toEqual({ big: 10 });
	});

	test("should convert Error objects to a plain shape", () => {
		const error = new Error("boom");
		const serialized = jsonSerializeSafe({ error });

		expect(serialized.error.name).toBe("Error");
		expect(serialized.error.message).toBe("boom");
	});

	test("should return undefined for a pure undefined value, matching JSON.stringify", () => {
		expect(jsonSerializeSafe(undefined)).toBeUndefined();
	});
});
