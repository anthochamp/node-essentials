import { describe, expect, it } from "vitest";

import { joinMappings } from "./join-mappings.js";

const keepIncoming = <K, V>(_key: K, _existing: V, incoming: V): V => incoming;

describe("joinMappings", () => {
	it("should merge disjoint maps", () => {
		const joined = joinMappings(
			[new Map([["a", 1]]), new Map([["b", 2]])],
			keepIncoming,
		);

		expect([...joined]).toEqual([
			["a", 1],
			["b", 2],
		]);
	});

	it("should call the resolver only for repeated keys", () => {
		const conflicts: string[] = [];
		joinMappings(
			[
				new Map([
					["a", 1],
					["b", 2],
				]),
				new Map([["b", 3]]),
			],
			(key, existing, incoming) => {
				conflicts.push(key);
				return existing + incoming;
			},
		);

		expect(conflicts).toEqual(["b"]);
	});

	it("should keep whatever the resolver returns", () => {
		const joined = joinMappings(
			[new Map([["a", 1]]), new Map([["a", 10]])],
			(_key, existing, incoming) => existing + incoming,
		);

		expect(joined.get("a")).toBe(11);
	});

	it("should reproduce last-write-wins when asked to", () => {
		const joined = joinMappings(
			[new Map([["a", 1]]), new Map([["a", 2]])],
			keepIncoming,
		);

		expect(joined.get("a")).toBe(2);
	});

	it("should reproduce first-write-wins when asked to", () => {
		const joined = joinMappings(
			[new Map([["a", 1]]), new Map([["a", 2]])],
			(_key, existing) => existing,
		);

		expect(joined.get("a")).toBe(1);
	});

	it("should keep first-appearance insertion order", () => {
		const joined = joinMappings(
			[
				new Map([
					["a", 1],
					["b", 2],
				]),
				new Map([
					["c", 3],
					["a", 4],
				]),
			],
			keepIncoming,
		);

		expect([...joined.keys()]).toEqual(["a", "b", "c"]);
	});

	it("should return an empty map for no inputs", () => {
		expect(joinMappings([], keepIncoming).size).toBe(0);
	});

	it("should not modify the inputs", () => {
		const first = new Map([["a", 1]]);
		const second = new Map([["a", 2]]);
		joinMappings([first, second], keepIncoming);

		expect(first.get("a")).toBe(1);
		expect(second.get("a")).toBe(2);
	});

	it("should treat an existing undefined value as a conflict", () => {
		const joined = joinMappings<string, number | undefined>(
			[new Map([["a", undefined]]), new Map([["a", 2]])],
			(_key, existing) => existing,
		);

		expect(joined.get("a")).toBeUndefined();
		expect(joined.has("a")).toBe(true);
	});

	it("should chain more than two maps", () => {
		const joined = joinMappings(
			[new Map([["a", 1]]), new Map([["a", 2]]), new Map([["a", 3]])],
			(_key, existing, incoming) => existing + incoming,
		);

		expect(joined.get("a")).toBe(6);
	});
});
