import { afterEach, expect, suite, test } from "vitest";

import { parseIni } from "./parse.js";

type Polluted = { polluted?: unknown };

afterEach(() => {
	delete (Object.prototype as Polluted).polluted;
});

suite("INI prototype pollution", () => {
	test("should keep a top-level __proto__ key as an own entry", () => {
		const value = parseIni("__proto__ = polluted\n");

		expect(({} as Polluted).polluted).toBeUndefined();
		expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
		expect(value["__proto__"]).toBe("polluted");
	});

	test("should keep a __proto__ key inside a section as an own entry", () => {
		const value = parseIni("[a]\n__proto__ = polluted\n");
		const section = value["a"] as Record<string, unknown>;

		expect(({} as Polluted).polluted).toBeUndefined();
		expect(section["__proto__"]).toBe("polluted");
	});

	test("should not pollute through a __proto__ section name", () => {
		parseIni("[__proto__]\npolluted = yes\n");

		expect(({} as Polluted).polluted).toBeUndefined();
	});

	test("should not pollute through a dotted __proto__ section name", () => {
		parseIni("[a.__proto__]\npolluted = yes\n", { dottedKeys: true });

		expect(({} as Polluted).polluted).toBeUndefined();
	});

	test("should treat a constructor key as a first occurrence", () => {
		const value = parseIni("constructor = one\n");

		expect(value["constructor"]).toBe("one");
	});

	test("should collect repeated constructor keys under the array policy", () => {
		const value = parseIni("constructor = one\nconstructor = two\n", {
			duplicateKeys: "array",
		});

		expect(value["constructor"]).toStrictEqual(["one", "two"]);
	});
});
