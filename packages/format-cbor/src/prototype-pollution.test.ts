import { afterEach, expect, suite, test } from "vitest";

import { dataValueToJson } from "./json-bridge.js";

type Polluted = { polluted?: unknown };

afterEach(() => {
	delete (Object.prototype as Polluted).polluted;
});

suite("CBOR prototype pollution", () => {
	test("should keep a __proto__ map key as an own entry", () => {
		const json = dataValueToJson({
			kind: "map",
			entries: [
				[
					{ kind: "text", value: "__proto__" },
					{
						kind: "map",
						entries: [
							[
								{ kind: "text", value: "polluted" },
								{ kind: "bool", value: true },
							],
						],
					},
				],
			],
		}) as Record<string, unknown>;

		expect(({} as Polluted).polluted).toBeUndefined();
		expect(Object.getPrototypeOf(json)).toBe(Object.prototype);
		expect(json["__proto__"]).toStrictEqual({ polluted: true });
	});
});
