import { expect, suite, test } from "vitest";
import { CaseInsensitiveMap } from "./case-insensitive-map.js";

suite("CaseInsensitiveMap", () => {
	test("should treat string keys in a case-insensitive manner", () => {
		const map = new CaseInsensitiveMap<string, number>();

		map.set("Content-Type", 1);
		expect(map.get("content-type")).toBe(1);
		expect(map.get("CONTENT-TYPE")).toBe(1);
		expect(map.has("CoNtEnT-TyPe")).toBe(true);

		map.set("content-type", 2);
		expect(map.get("Content-Type")).toBe(2);
		expect(map.size).toBe(1);

		map.set("Accept", 3);
		expect(map.get("ACCEPT")).toBe(3);
		expect(map.size).toBe(2);

		expect(map.delete("aCcEpT")).toBe(true);
		expect(map.has("accept")).toBe(false);
		expect(map.size).toBe(1);
	});

	test("should treat non-string keys in a case-sensitive manner", () => {
		const map = new CaseInsensitiveMap<number, string>();

		map.set(1, "one");
		expect(map.get(1)).toBe("one");
		expect(map.has(1)).toBe(true);
		expect(map.has(2)).toBe(false);

		map.set(2, "two");
		expect(map.get(2)).toBe("two");
		expect(map.size).toBe(2);

		map.set(1, "uno");
		expect(map.get(1)).toBe("uno");
		expect(map.size).toBe(2);

		expect(map.delete(2)).toBe(true);
		expect(map.has(2)).toBe(false);
		expect(map.size).toBe(1);
	});
});
