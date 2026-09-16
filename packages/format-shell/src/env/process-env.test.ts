import { expect, suite, test } from "vitest";

import { fromProcessEnv, toProcessEnv } from "./process-env.js";

suite("toProcessEnv", () => {
	test("should print every value as a string", () => {
		expect(toProcessEnv({ A: "text", B: 42, C: 9n, D: true, E: null })).toEqual(
			{ A: "text", B: "42", C: "9", D: "1", E: "" },
		);
	});

	test("should honour the bool flavor", () => {
		expect(toProcessEnv({ A: false }, { boolFlavor: "true/false" })).toEqual({
			A: "false",
		});
	});
});

suite("fromProcessEnv", () => {
	test("should drop the names that are present but unset", () => {
		expect(fromProcessEnv({ A: "1", B: undefined, C: "" })).toEqual({
			A: "1",
			C: "",
		});
	});

	test("should not let a name of __proto__ reach the prototype", () => {
		const converted = fromProcessEnv({ __proto__: "polluted", A: "1" });

		expect(Object.getPrototypeOf({})).toBe(Object.prototype);
		expect(converted.A).toBe("1");
	});
});
