import { afterEach, describe, expect, it } from "vitest";

import { defaults } from "./defaults.js";
import { mergeInplace } from "./merge-inplace.js";
import { merge, mergeAll } from "./merge.js";
import { setAtPath } from "./set-at-path.js";

type Polluted = { polluted?: unknown };

/** What `JSON.parse` yields for `{"__proto__": {"polluted": "yes"}}`. */
function hostilePayload(): Record<string, unknown> {
	return JSON.parse('{"__proto__": {"polluted": "yes"}}') as Record<
		string,
		unknown
	>;
}

afterEach(() => {
	delete (Object.prototype as Polluted).polluted;
	delete (Array.prototype as Polluted).polluted;
});

describe("prototype pollution", () => {
	it("should not let a hostile payload through merge", () => {
		const merged = merge({ a: 1 }, hostilePayload());

		expect(({} as Polluted).polluted).toBeUndefined();
		expect(merged).toHaveProperty("a", 1);
	});

	it("should not let a hostile payload through mergeAll", () => {
		mergeAll([{ a: 1 }, hostilePayload(), { b: 2 }]);

		expect(({} as Polluted).polluted).toBeUndefined();
	});

	it("should not let a hostile payload through mergeInplace", () => {
		const target: Record<string, unknown> = { a: 1 };
		mergeInplace(target, hostilePayload());

		expect(({} as Polluted).polluted).toBeUndefined();
		expect(target["a"]).toBe(1);
	});

	it("should not let a hostile payload through defaults", () => {
		defaults({}, hostilePayload());

		expect(({} as Polluted).polluted).toBeUndefined();
	});

	it("should ignore an inherited enumerable source key when merging", () => {
		const source = Object.create({ inherited: "no" }) as Record<
			string,
			unknown
		>;
		source["own"] = "yes";

		expect(merge({}, source)).toStrictEqual({ own: "yes" });
	});

	it("should refuse a setAtPath path through __proto__", () => {
		const root: Record<string, unknown> = {};
		setAtPath(root, ["__proto__", "polluted"], "yes");

		expect(({} as Polluted).polluted).toBeUndefined();
		expect(root).toStrictEqual({});
	});

	it("should refuse a setAtPath path through constructor.prototype", () => {
		const root: Record<string, unknown> = {};
		setAtPath(root, ["constructor", "prototype", "polluted"], "yes");

		expect(({} as Polluted).polluted).toBeUndefined();
		expect(root).toStrictEqual({});
	});

	it("should still write an ordinary nested path", () => {
		const root: Record<string, unknown> = {};
		setAtPath(root, ["a", "b"], 1);

		expect(root).toStrictEqual({ a: { b: 1 } });
	});
});
