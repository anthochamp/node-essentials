import { describe, expect, it, vi } from "vitest";
import {
	TraverseBreak,
	TraverseContinue,
	TraverseHalt,
	TraverseSkip,
	type TraverseVisitor,
	traverse,
} from "./traverse.js";

const TEST_ARRAY = [10, 20, [30, 40], 50];
const TEST_SYMBOL = Symbol("test symbol");
const TEST_OBJECT = {
	a: 1,
	b: { b1: 21, b2: 22 },
	c: 3,
	[TEST_SYMBOL]: "symbol value",
};
Object.defineProperty(TEST_OBJECT, "nonEnum", {
	value: "hidden",
	enumerable: false,
});

const TEST_OBJECT_PROTO_OBJECT = {
	protoProp: "protoValue",
};

const TEST_OBJECT_PROTO = Object.create(TEST_OBJECT_PROTO_OBJECT, {
	enumProp: {
		value: "enumValue",
		enumerable: true,
	},
	nonEnumProp: {
		value: "nonEnumValue",
		enumerable: false,
	},
});
const TEST_MAP = new Map<string, number | Map<[number, number], string>>([
	["key1", 100],
	["key2", 200],
	[
		"key3",
		new Map<[number, number], string>([
			[[11, 12], "one"],
			[[21, 22], "two"],
		]),
	],
	["key4", 400],
]);

const TEST_SET = new Set<number | Set<number>>([
	10,
	20,
	new Set<number>([1, 2]),
	30,
]);

describe("traverse", () => {
	describe("control flow", () => {
		describe("TraverseBreak", () => {
			it("should stop processing siblings in arrays", () => {
				const array = TEST_ARRAY;

				const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
					if (value === 20) {
						return TraverseBreak;
					}
					return TraverseContinue;
				});

				traverse(array, visitor, { traverseArrays: true });

				expect(visitor).toHaveBeenCalledTimes(3);
				expect(visitor).toHaveBeenNthCalledWith(
					1,
					array,
					expect.objectContaining({
						parent: undefined,
						key: null,
						parentPath: null,
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					2,
					10,
					expect.objectContaining({
						parent: array,
						key: { kind: "array", index: 0 },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					3,
					20,
					expect.objectContaining({
						parent: array,
						key: { kind: "array", index: 1 },
						parentPath: [],
					}),
				);
			});

			it("should only stop current nesting level in arrays", () => {
				const array = TEST_ARRAY;

				const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
					if (value === 30) {
						return TraverseBreak;
					}
					return TraverseContinue;
				});

				traverse(array, visitor, { traverseArrays: true });

				expect(visitor).toHaveBeenCalledTimes(6);
				expect(visitor).toHaveBeenNthCalledWith(
					1,
					array,
					expect.objectContaining({
						parent: undefined,
						key: null,
						parentPath: null,
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					2,
					10,
					expect.objectContaining({
						parent: array,
						key: { kind: "array", index: 0 },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					3,
					20,
					expect.objectContaining({
						parent: array,
						key: { kind: "array", index: 1 },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					4,
					array[2],
					expect.objectContaining({
						parent: array,
						key: { kind: "array", index: 2 },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					5,
					30,
					expect.objectContaining({
						parent: array[2],
						key: { kind: "array", index: 0 },
						parentPath: [{ kind: "array", index: 2 }],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					6,
					50,
					expect.objectContaining({
						parent: array,
						key: { kind: "array", index: 3 },
						parentPath: [],
					}),
				);
			});

			it("should stop processing siblings in objects", () => {
				const object = TEST_OBJECT;

				const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
					if (value === object.b) {
						return TraverseBreak;
					}
					return TraverseContinue;
				});

				traverse(object, visitor, {});

				expect(visitor).toHaveBeenCalledTimes(3);
				expect(visitor).toHaveBeenNthCalledWith(
					1,
					object,
					expect.objectContaining({
						parent: undefined,
						key: null,
						parentPath: null,
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					2,
					1,
					expect.objectContaining({
						parent: object,
						key: { kind: "object", property: "a", prototype: object },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					3,
					object.b,
					expect.objectContaining({
						parent: object,
						key: { kind: "object", property: "b", prototype: object },
						parentPath: [],
					}),
				);
			});

			it("should only stop current nesting level in objects", () => {
				const object = TEST_OBJECT;

				const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
					if (value === object.b.b1) {
						return TraverseBreak;
					}
					return TraverseContinue;
				});

				traverse(object, visitor, {});

				expect(visitor).toHaveBeenCalledTimes(5);
				expect(visitor).toHaveBeenNthCalledWith(
					1,
					object,
					expect.objectContaining({
						parent: undefined,
						key: null,
						parentPath: null,
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					2,
					1,
					expect.objectContaining({
						parent: object,
						key: { kind: "object", property: "a", prototype: object },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					3,
					object.b,
					expect.objectContaining({
						parent: object,
						key: { kind: "object", property: "b", prototype: object },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					4,
					21,
					expect.objectContaining({
						parent: object.b,
						key: { kind: "object", property: "b1", prototype: object.b },
						parentPath: [{ kind: "object", property: "b", prototype: object }],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					5,
					3,
					expect.objectContaining({
						parent: object,
						key: { kind: "object", property: "c", prototype: object },
						parentPath: [],
					}),
				);
			});

			it("should stop processing siblings in Maps", () => {
				const map = TEST_MAP;

				const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
					if (value === 200) {
						return TraverseBreak;
					}
					return TraverseContinue;
				});

				traverse(map, visitor);

				expect(visitor).toHaveBeenCalledTimes(3);
				expect(visitor).toHaveBeenNthCalledWith(
					1,
					map,
					expect.objectContaining({
						parent: undefined,
						key: null,
						parentPath: null,
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					2,
					100,
					expect.objectContaining({
						parent: map,
						key: { kind: "map", key: "key1" },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					3,
					200,
					expect.objectContaining({
						parent: map,
						key: { kind: "map", key: "key2" },
						parentPath: [],
					}),
				);
			});

			it("should only stop current nesting level in Maps", () => {
				const map = TEST_MAP;
				const nestedMap = map.get("key3") as Map<[number, number], string>;

				const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
					if (value === "one") {
						return TraverseBreak;
					}
					return TraverseContinue;
				});

				traverse(map, visitor);

				expect(visitor).toHaveBeenCalledTimes(6);
				expect(visitor).toHaveBeenNthCalledWith(
					1,
					map,
					expect.objectContaining({
						parent: undefined,
						key: null,
						parentPath: null,
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					2,
					100,
					expect.objectContaining({
						parent: map,
						key: { kind: "map", key: "key1" },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					3,
					200,
					expect.objectContaining({
						parent: map,
						key: { kind: "map", key: "key2" },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					4,
					nestedMap,
					expect.objectContaining({
						parent: map,
						key: { kind: "map", key: "key3" },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					5,
					"one",
					expect.objectContaining({
						parent: nestedMap,
						key: { kind: "map", key: [11, 12] },
						parentPath: [{ kind: "map", key: "key3" }],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					6,
					400,
					expect.objectContaining({
						parent: map,
						key: { kind: "map", key: "key4" },
						parentPath: [],
					}),
				);
			});

			it("should stop processing siblings in Sets", () => {
				const set = TEST_SET;

				const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
					if (value === 20) {
						return TraverseBreak;
					}
					return TraverseContinue;
				});

				traverse(set, visitor);

				expect(visitor).toHaveBeenCalledTimes(3);
				expect(visitor).toHaveBeenNthCalledWith(
					1,
					set,
					expect.objectContaining({
						parent: undefined,
						key: null,
						parentPath: null,
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					2,
					10,
					expect.objectContaining({
						parent: set,
						key: { kind: "set", value: 10 },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					3,
					20,
					expect.objectContaining({
						parent: set,
						key: { kind: "set", value: 20 },
						parentPath: [],
					}),
				);
			});

			it("should only stop current nesting level in Sets", () => {
				const set = TEST_SET;
				const nestedSet = Array.from(set.values()).find(
					(v) => v instanceof Set,
				) as Set<number>;

				const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
					if (value === 1) {
						return TraverseBreak;
					}
					return TraverseContinue;
				});

				traverse(set, visitor);

				expect(visitor).toHaveBeenCalledTimes(6);
				expect(visitor).toHaveBeenNthCalledWith(
					1,
					set,
					expect.objectContaining({
						parent: undefined,
						key: null,
						parentPath: null,
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					2,
					10,
					expect.objectContaining({
						parent: set,
						key: { kind: "set", value: 10 },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					3,
					20,
					expect.objectContaining({
						parent: set,
						key: { kind: "set", value: 20 },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					4,
					nestedSet,
					expect.objectContaining({
						parent: set,
						key: { kind: "set", value: nestedSet },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					5,
					1,
					expect.objectContaining({
						parent: nestedSet,
						key: { kind: "set", value: 1 },
						parentPath: [{ kind: "set", value: nestedSet }],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					6,
					30,
					expect.objectContaining({
						parent: set,
						key: { kind: "set", value: 30 },
						parentPath: [],
					}),
				);
			});
		});

		describe("TraverseHalt", () => {
			it("should halt entire traversal in arrays", () => {
				const array = TEST_ARRAY;

				const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
					if (value === 30) {
						return TraverseHalt;
					}
					return TraverseContinue;
				});

				traverse(array, visitor, { traverseArrays: true });

				expect(visitor).toHaveBeenCalledTimes(5);
				expect(visitor).toHaveBeenNthCalledWith(
					1,
					array,
					expect.objectContaining({
						parent: undefined,
						key: null,
						parentPath: null,
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					2,
					10,
					expect.objectContaining({
						parent: array,
						key: { kind: "array", index: 0 },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					3,
					20,
					expect.objectContaining({
						parent: array,
						key: { kind: "array", index: 1 },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					4,
					array[2],
					expect.objectContaining({
						parent: array,
						key: { kind: "array", index: 2 },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					5,
					30,
					expect.objectContaining({
						parent: array[2],
						key: { kind: "array", index: 0 },
						parentPath: [{ kind: "array", index: 2 }],
					}),
				);
			});

			it("should halt entire traversal in objects", () => {
				const object = TEST_OBJECT;

				const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
					if (value === object.b.b1) {
						return TraverseHalt;
					}
					return TraverseContinue;
				});

				traverse(object, visitor, {});

				expect(visitor).toHaveBeenCalledTimes(4);
				expect(visitor).toHaveBeenNthCalledWith(
					1,
					object,
					expect.objectContaining({
						parent: undefined,
						key: null,
						parentPath: null,
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					2,
					1,
					expect.objectContaining({
						parent: object,
						key: { kind: "object", property: "a", prototype: object },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					3,
					object.b,
					expect.objectContaining({
						parent: object,
						key: { kind: "object", property: "b", prototype: object },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					4,
					21,
					expect.objectContaining({
						parent: object.b,
						key: { kind: "object", property: "b1", prototype: object.b },
						parentPath: [{ kind: "object", property: "b", prototype: object }],
					}),
				);
			});

			it("should halt entire traversal in Maps", () => {
				const map = TEST_MAP;
				const nestedMap = map.get("key3") as Map<[number, number], string>;

				const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
					if (value === "one") {
						return TraverseHalt;
					}
					return TraverseContinue;
				});

				traverse(map, visitor);

				expect(visitor).toHaveBeenCalledTimes(5);
				expect(visitor).toHaveBeenNthCalledWith(
					1,
					map,
					expect.objectContaining({
						parent: undefined,
						key: null,
						parentPath: null,
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					2,
					100,
					expect.objectContaining({
						parent: map,
						key: { kind: "map", key: "key1" },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					3,
					200,
					expect.objectContaining({
						parent: map,
						key: { kind: "map", key: "key2" },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					4,
					nestedMap,
					expect.objectContaining({
						parent: map,
						key: { kind: "map", key: "key3" },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					5,
					"one",
					expect.objectContaining({
						parent: nestedMap,
						key: { kind: "map", key: [11, 12] },
						parentPath: [{ kind: "map", key: "key3" }],
					}),
				);
			});

			it("should halt entire traversal in Sets", () => {
				const set = TEST_SET;
				const nestedSet = Array.from(set.values()).find(
					(v) => v instanceof Set,
				) as Set<number>;

				const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
					if (value === 1) {
						return TraverseHalt;
					}
					return TraverseContinue;
				});

				traverse(set, visitor);

				expect(visitor).toHaveBeenCalledTimes(5);
				expect(visitor).toHaveBeenNthCalledWith(
					1,
					set,
					expect.objectContaining({
						parent: undefined,
						key: null,
						parentPath: null,
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					2,
					10,
					expect.objectContaining({
						parent: set,
						key: { kind: "set", value: 10 },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					3,
					20,
					expect.objectContaining({
						parent: set,
						key: { kind: "set", value: 20 },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					4,
					nestedSet,
					expect.objectContaining({
						parent: set,
						key: { kind: "set", value: nestedSet },
						parentPath: [],
					}),
				);
				expect(visitor).toHaveBeenNthCalledWith(
					5,
					1,
					expect.objectContaining({
						parent: nestedSet,
						key: { kind: "set", value: 1 },
						parentPath: [{ kind: "set", value: nestedSet }],
					}),
				);
			});

			it("should return partially mutated object at top level", () => {
				const input = { a: 1, b: 2, c: 3, d: 4 };

				const result = traverse(input, (value, context) => {
					if (context.key?.kind === "object" && context.key.property === "c") {
						return TraverseHalt;
					}
					if (typeof value === "number") {
						context.replace(value * 10);
					}
					return TraverseContinue;
				});

				expect(result).toBe(input); // Same reference, mutated in-place
				expect(result).toEqual({ a: 10, b: 20, c: 3, d: 4 }); // c was visited but not transformed, d not visited
			});
		});

		describe("TraverseSkip", () => {
			it("should keep value and skip recursion", () => {
				const input = { a: 1, b: { c: 2, d: 3 }, e: 4 };

				const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
					if (typeof value === "object" && value !== null && "c" in value) {
						return TraverseSkip;
					}
					return TraverseContinue;
				});

				const result = traverse(input, visitor);

				expect(result).toBe(input);
				expect(visitor).toHaveBeenCalledWith(
					input,
					expect.objectContaining({
						parent: undefined,
						key: null,
						parentPath: null,
					}),
				);
				expect(visitor).toHaveBeenCalledWith(1, expect.anything());
				expect(visitor).toHaveBeenCalledWith(input.b, expect.anything());
				expect(visitor).not.toHaveBeenCalledWith(2, expect.anything());
				expect(visitor).not.toHaveBeenCalledWith(3, expect.anything());
				expect(visitor).toHaveBeenCalledWith(4, expect.anything());
			});

			it("should work with arrays", () => {
				const input = [1, [2, 3], 4];

				const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
					if (Array.isArray(value) && value.length === 2) {
						return TraverseSkip;
					}
					return TraverseContinue;
				});

				const result = traverse(input, visitor, { traverseArrays: true });

				expect(result).toBe(input);
				expect(visitor).not.toHaveBeenCalledWith(2, expect.anything());
				expect(visitor).not.toHaveBeenCalledWith(3, expect.anything());
			});
		});

		describe("TraverseContinue", () => {
			it("should continue normal traversal", () => {
				const input = { a: 1, b: { c: 2 } };
				const visitor = vi
					.fn<TraverseVisitor>()
					.mockReturnValue(TraverseContinue);

				traverse(input, visitor);

				expect(visitor).toHaveBeenCalledTimes(4);
			});
		});

		describe("TraverseRemove", () => {
			it("should remove properties from objects", () => {
				const input = { a: 1, b: 2, c: 3 };

				const result = traverse(input, (value, context) => {
					if (value === 2) {
						context.remove();
					}
					return TraverseContinue;
				});

				expect(result).toBe(input);
				expect(result).toEqual({ a: 1, c: 3 });
			});

			it("should remove items from arrays", () => {
				const input = [1, 2, 3, 4];

				const result = traverse(input, (value, context) => {
					if (typeof value === "number" && value % 2 === 0) {
						context.remove();
					}
					return TraverseContinue;
				});

				expect(result).toBe(input);
				expect(result).toEqual([1, 3]);
			});

			it("should remove entries from Maps", () => {
				const input = new Map([
					["a", 1],
					["b", 2],
					["c", 3],
				]);

				const result = traverse(input, (_, context) => {
					if (context.key?.kind === "map" && context.key.key === "b") {
						context.remove();
					}
					return TraverseContinue;
				});

				expect(result).toBe(input);
				expect(result).toEqual(
					new Map([
						["a", 1],
						["c", 3],
					]),
				);
			});

			it("should remove values from Sets", () => {
				const input = new Set([1, 2, 3, 4]);

				const result = traverse(input, (value, context) => {
					if (typeof value === "number" && value % 2 === 0) {
						context.remove();
					}
					return TraverseContinue;
				});

				expect(result).toBe(input);
				expect(result).toEqual(new Set([1, 3]));
			});

			it("should remove nested structures", () => {
				const input = {
					users: [
						{ name: "Alice", age: 30 },
						{ name: "Bob", age: 25 },
					],
				};

				const result = traverse(input, (value, context) => {
					if (
						typeof value === "object" &&
						value !== null &&
						"name" in value &&
						value.name === "Alice"
					) {
						context.remove();
					}
					return TraverseContinue;
				});

				expect(result).toEqual({
					users: [{ name: "Bob", age: 25 }],
				});
			});
		});
	});

	describe("array", () => {
		it("visits all items", () => {
			const array = TEST_ARRAY;

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockImplementation(() => TraverseContinue);

			traverse(array, visitor);

			expect(visitor).toHaveBeenCalledTimes(7);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				array,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				10,
				expect.objectContaining({
					parent: array,
					key: { kind: "array", index: 0 },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				3,
				20,
				expect.objectContaining({
					parent: array,
					key: { kind: "array", index: 1 },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				4,
				array[2],
				expect.objectContaining({
					parent: array,
					key: { kind: "array", index: 2 },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				5,
				30,
				expect.objectContaining({
					parent: array[2],
					key: { kind: "array", index: 0 },
					parentPath: [{ kind: "array", index: 2 }],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				6,
				40,
				expect.objectContaining({
					parent: array[2],
					key: { kind: "array", index: 1 },
					parentPath: [{ kind: "array", index: 2 }],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				7,
				50,
				expect.objectContaining({
					parent: array,
					key: { kind: "array", index: 3 },
					parentPath: [],
				}),
			);
		});

		it("skips items when visitArrayIndices is false", () => {
			const array = TEST_ARRAY;
			const visitor = vi
				.fn<TraverseVisitor>()
				.mockImplementation(() => TraverseContinue);

			traverse(array, visitor, { traverseArrays: false });

			expect(visitor).toHaveBeenCalledTimes(1);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				array,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
		});

		it("skips primitive items when visitPrimitives is false", () => {
			const array = TEST_ARRAY;
			const visitor = vi
				.fn<TraverseVisitor>()
				.mockImplementation(() => TraverseContinue);

			traverse(array, visitor, {
				traverseArrays: true,
				visitPrimitives: false,
			});

			expect(visitor).toHaveBeenCalledTimes(2);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				array,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				array[2],
				expect.objectContaining({
					parent: array,
					key: { kind: "array", index: 2 },
					parentPath: [],
				}),
			);
		});

		it("should not visit sparse array indices", () => {
			// biome-ignore lint/suspicious/noSparseArray: test
			const array = [10, , 30]; // sparse array with a missing element at index 1

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockImplementation(() => TraverseContinue);

			traverse(array, visitor, { traverseArrays: true });

			expect(visitor).toHaveBeenCalledTimes(3);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				array,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				10,
				expect.objectContaining({
					parent: array,
					key: { kind: "array", index: 0 },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				3,
				30,
				expect.objectContaining({
					parent: array,
					key: { kind: "array", index: 2 },
					parentPath: [],
				}),
			);
		});

		it("respects TraverseBreak", () => {
			const array = TEST_ARRAY;

			const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
				if (value === 20) {
					return TraverseBreak;
				}
				return TraverseContinue;
			});

			traverse(array, visitor, { traverseArrays: true });

			expect(visitor).toHaveBeenCalledTimes(3);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				array,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				10,
				expect.objectContaining({
					parent: array,
					key: { kind: "array", index: 0 },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				3,
				20,
				expect.objectContaining({
					parent: array,
					key: { kind: "array", index: 1 },
					parentPath: [],
				}),
			);
		});

		it("respects TraverseBreak in nested arrays", () => {
			const array = TEST_ARRAY;
			const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
				if (value === 30) {
					return TraverseBreak;
				}
				return TraverseContinue;
			});

			traverse(array, visitor, { traverseArrays: true });

			expect(visitor).toHaveBeenCalledTimes(6);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				array,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				10,
				expect.objectContaining({
					parent: array,
					key: { kind: "array", index: 0 },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				3,
				20,
				expect.objectContaining({
					parent: array,
					key: { kind: "array", index: 1 },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				4,
				array[2],
				expect.objectContaining({
					parent: array,
					key: { kind: "array", index: 2 },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				5,
				30,
				expect.objectContaining({
					parent: array[2],
					key: { kind: "array", index: 0 },
					parentPath: [{ kind: "array", index: 2 }],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				6,
				50,
				expect.objectContaining({
					parent: array,
					key: { kind: "array", index: 3 },
					parentPath: [],
				}),
			);
		});

		it("respects TraverseHalt", () => {
			const array = TEST_ARRAY;

			const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
				if (value === 30) {
					return TraverseHalt;
				}
				return TraverseContinue;
			});

			traverse(array, visitor, { traverseArrays: true });

			expect(visitor).toHaveBeenCalledTimes(5);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				array,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				10,
				expect.objectContaining({
					parent: array,
					key: { kind: "array", index: 0 },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				3,
				20,
				expect.objectContaining({
					parent: array,
					key: { kind: "array", index: 1 },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				4,
				array[2],
				expect.objectContaining({
					parent: array,
					key: { kind: "array", index: 2 },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				5,
				30,
				expect.objectContaining({
					parent: array[2],
					key: { kind: "array", index: 0 },
					parentPath: [{ kind: "array", index: 2 }],
				}),
			);
		});
	});

	describe("object", () => {
		it("visits all properties", () => {
			const object = TEST_OBJECT;

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockImplementation(() => TraverseContinue);

			traverse(object, visitor, {});

			expect(visitor).toHaveBeenCalledTimes(6);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				object,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				1,
				expect.objectContaining({
					parent: object,
					key: { kind: "object", property: "a", prototype: object },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				3,
				object.b,
				expect.objectContaining({
					parent: object,
					key: { kind: "object", property: "b", prototype: object },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				4,
				21,
				expect.objectContaining({
					parent: object.b,
					key: { kind: "object", property: "b1", prototype: object.b },
					parentPath: [{ kind: "object", property: "b", prototype: object }],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				5,
				22,
				expect.objectContaining({
					parent: object.b,
					key: { kind: "object", property: "b2", prototype: object.b },
					parentPath: [{ kind: "object", property: "b", prototype: object }],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				6,
				3,
				expect.objectContaining({
					parent: object,
					key: { kind: "object", property: "c", prototype: object },
					parentPath: [],
				}),
			);
		});

		it("skips primitive properties when visitPrimitives is false", () => {
			const object = TEST_OBJECT;
			const visitor = vi
				.fn<TraverseVisitor>()
				.mockImplementation(() => TraverseContinue);

			traverse(object, visitor, { visitPrimitives: false });

			expect(visitor).toHaveBeenCalledTimes(2);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				object,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				object.b,
				expect.objectContaining({
					parent: object,
					key: { kind: "object", property: "b", prototype: object },
					parentPath: [],
				}),
			);
		});

		it("visits non-enumerable properties when includeNonEnumerable is true", () => {
			const object = TEST_OBJECT;

			const visitor = vi.fn<TraverseVisitor>().mockImplementation(() => {
				// Transform non-enumerable property would fail due to read-only
				// Just visit without transforming
				return TraverseContinue;
			});

			traverse(object, visitor, { includeNonEnumerable: true });

			expect(visitor).toHaveBeenCalledWith(
				"hidden",
				expect.objectContaining({
					parent: object,
					key: {
						kind: "object",
						property: "nonEnum",
						prototype: object,
						nonEnumerable: true,
					},
					parentPath: [],
				}),
			);
		});

		it("visits symbol-keyed properties when includeSymbolKeys is true", () => {
			const object = TEST_OBJECT;

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockImplementation(() => TraverseContinue);

			traverse(object, visitor, { includeSymbolKeys: true });

			expect(visitor).toHaveBeenCalledWith(
				"symbol value",
				expect.objectContaining({
					parent: object,
					key: { kind: "object", property: TEST_SYMBOL, prototype: object },
					parentPath: [],
				}),
			);
		});

		it("respects TraverseBreak", () => {
			const object = TEST_OBJECT;

			const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
				if (value === object.b) {
					return TraverseBreak;
				}
				return TraverseContinue;
			});

			traverse(object, visitor, {});

			expect(visitor).toHaveBeenCalledTimes(3);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				object,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				1,
				expect.objectContaining({
					parent: object,
					key: { kind: "object", property: "a", prototype: object },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				3,
				object.b,
				expect.objectContaining({
					parent: object,
					key: { kind: "object", property: "b", prototype: object },
					parentPath: [],
				}),
			);
		});

		it("respects TraverseBreak in nested objects", () => {
			const object = TEST_OBJECT;

			const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
				if (value === 21) {
					return TraverseBreak;
				}
				return TraverseContinue;
			});

			traverse(object, visitor, {});

			expect(visitor).toHaveBeenCalledTimes(5);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				object,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				1,
				expect.objectContaining({
					parent: object,
					key: { kind: "object", property: "a", prototype: object },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				3,
				object.b,
				expect.objectContaining({
					parent: object,
					key: { kind: "object", property: "b", prototype: object },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				4,
				21,
				expect.objectContaining({
					parent: object.b,
					key: { kind: "object", property: "b1", prototype: object.b },
					parentPath: [{ kind: "object", property: "b", prototype: object }],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				5,
				3,
				expect.objectContaining({
					parent: object,
					key: { kind: "object", property: "c", prototype: object },
					parentPath: [],
				}),
			);
		});

		it("respects TraverseHalt", () => {
			const object = TEST_OBJECT;

			const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
				if (value === 21) {
					return TraverseHalt;
				}
				return TraverseContinue;
			});

			traverse(object, visitor, {});

			expect(visitor).toHaveBeenCalledTimes(4);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				object,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				1,
				expect.objectContaining({
					parent: object,
					key: { kind: "object", property: "a", prototype: object },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				3,
				object.b,
				expect.objectContaining({
					parent: object,
					key: { kind: "object", property: "b", prototype: object },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				4,
				21,
				expect.objectContaining({
					parent: object.b,
					key: { kind: "object", property: "b1", prototype: object.b },
					parentPath: [{ kind: "object", property: "b", prototype: object }],
				}),
			);
		});
	});

	describe("object proto", () => {
		it("visits all properties", () => {
			const object = TEST_OBJECT_PROTO;

			const visitor = vi.fn<TraverseVisitor>().mockImplementation(() => {
				// Don't transform, just visit (properties are read-only)
				return TraverseContinue;
			});

			traverse(object, visitor, {
				traverseCustomObjects: (value) =>
					Object.getPrototypeOf(value) === TEST_OBJECT_PROTO_OBJECT,
			});

			expect(visitor).toHaveBeenCalledTimes(3);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				object,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				"enumValue",
				expect.objectContaining({
					parent: object,
					key: { kind: "object", property: "enumProp", prototype: object },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				3,
				"protoValue",
				expect.objectContaining({
					parent: object,
					key: {
						kind: "object",
						property: "protoProp",
						prototype: TEST_OBJECT_PROTO_OBJECT,
					},
					parentPath: [],
				}),
			);
		});

		it("visits non-enumerable properties when includeNonEnumerable is true", () => {
			const object = TEST_OBJECT_PROTO;

			const visitor = vi.fn<TraverseVisitor>().mockImplementation(() => {
				// Don't transform, just visit (properties are read-only)
				return TraverseContinue;
			});

			traverse(object, visitor, {
				includeNonEnumerable: true,
				traverseCustomObjects: (value) =>
					Object.getPrototypeOf(value) === TEST_OBJECT_PROTO_OBJECT,
			});

			expect(visitor).toHaveBeenCalledWith(
				"nonEnumValue",
				expect.objectContaining({
					parent: object,
					key: {
						kind: "object",
						property: "nonEnumProp",
						prototype: object,
						nonEnumerable: true,
					},
					parentPath: [],
				}),
			);
		});

		it("skips prototype properties when includePrototypeChain is false", () => {
			const object = TEST_OBJECT_PROTO;

			const visitor = vi.fn<TraverseVisitor>().mockImplementation(() => {
				// Don't transform, just visit (properties are read-only)
				return TraverseContinue;
			});

			traverse(object, visitor, {
				includePrototypeChain: false,
				traverseCustomObjects: (value) =>
					Object.getPrototypeOf(value) === TEST_OBJECT_PROTO_OBJECT,
			});

			expect(visitor).toHaveBeenCalledTimes(2);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				object,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				"enumValue",
				expect.objectContaining({
					parent: object,
					key: { kind: "object", property: "enumProp", prototype: object },
					parentPath: [],
				}),
			);
		});
	});

	describe("Map", () => {
		it("visits all entries", () => {
			const map = TEST_MAP;

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockImplementation(() => TraverseContinue);

			traverse(map, visitor);

			expect(visitor).toHaveBeenCalledTimes(7);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				map,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				100,
				expect.objectContaining({
					parent: map,
					key: { kind: "map", key: "key1" },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				3,
				200,
				expect.objectContaining({
					parent: map,
					key: { kind: "map", key: "key2" },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				4,
				map.get("key3"),
				expect.objectContaining({
					parent: map,
					key: { kind: "map", key: "key3" },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				5,
				"one",
				expect.objectContaining({
					parent: map.get("key3"),
					key: { kind: "map", key: [11, 12] },
					parentPath: [{ kind: "map", key: "key3" }],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				6,
				"two",
				expect.objectContaining({
					parent: map.get("key3"),
					key: { kind: "map", key: [21, 22] },
					parentPath: [{ kind: "map", key: "key3" }],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				7,
				400,
				expect.objectContaining({
					parent: map,
					key: { kind: "map", key: "key4" },
					parentPath: [],
				}),
			);
		});

		it("visits map keys when visitMapKeys is true", () => {
			const map = TEST_MAP;

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockImplementation(() => TraverseContinue);

			traverse(map, visitor, { traverseMapKeys: true });

			expect(visitor).toHaveBeenCalledTimes(17);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				"key1",
				expect.objectContaining({
					parent: map,
					key: { kind: "map-key", name: "key1" },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				4,
				"key2",
				expect.objectContaining({
					parent: map,
					key: { kind: "map-key", name: "key2" },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				6,
				"key3",
				expect.objectContaining({
					parent: map,
					key: { kind: "map-key", name: "key3" },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				8,
				[11, 12],
				expect.objectContaining({
					parent: map.get("key3"),
					key: { kind: "map-key", name: [11, 12] },
					parentPath: [{ kind: "map", key: "key3" }],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				9,
				11,
				expect.objectContaining({
					parent: [11, 12],
					key: { kind: "array", index: 0 },
					parentPath: [
						{ kind: "map", key: "key3" },
						{ kind: "map-key", name: [11, 12] },
					],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				10,
				12,
				expect.objectContaining({
					parent: [11, 12],
					key: { kind: "array", index: 1 },
					parentPath: [
						{ kind: "map", key: "key3" },
						{ kind: "map-key", name: [11, 12] },
					],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				12,
				[21, 22],
				expect.objectContaining({
					parent: map.get("key3"),
					key: { kind: "map-key", name: [21, 22] },
					parentPath: [{ kind: "map", key: "key3" }],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				13,
				21,
				expect.objectContaining({
					parent: [21, 22],
					key: { kind: "array", index: 0 },
					parentPath: [
						{ kind: "map", key: "key3" },
						{ kind: "map-key", name: [21, 22] },
					],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				14,
				22,
				expect.objectContaining({
					parent: [21, 22],
					key: { kind: "array", index: 1 },
					parentPath: [
						{ kind: "map", key: "key3" },
						{ kind: "map-key", name: [21, 22] },
					],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				16,
				"key4",
				expect.objectContaining({
					parent: map,
					key: { kind: "map-key", name: "key4" },
					parentPath: [],
				}),
			);
		});

		it("skips primitive entries when visitPrimitives is false", () => {
			const map = TEST_MAP;

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockImplementation(() => TraverseContinue);

			traverse(map, visitor, { visitPrimitives: false });

			expect(visitor).toHaveBeenCalledTimes(2);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				map,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				map.get("key3"),
				expect.objectContaining({
					parent: map,
					key: { kind: "map", key: "key3" },
					parentPath: [],
				}),
			);
		});

		it("respects TraverseBreak", () => {
			const map = TEST_MAP;

			const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
				if (value === map.get("key3")) {
					return TraverseBreak;
				}
				return TraverseContinue;
			});

			traverse(map, visitor);

			expect(visitor).toHaveBeenCalledTimes(4);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				map,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				100,
				expect.objectContaining({
					parent: map,
					key: { kind: "map", key: "key1" },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				3,
				200,
				expect.objectContaining({
					parent: map,
					key: { kind: "map", key: "key2" },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				4,
				map.get("key3"),
				expect.objectContaining({
					parent: map,
					key: { kind: "map", key: "key3" },
					parentPath: [],
				}),
			);
		});

		it("respects TraverseBreak in nested maps", () => {
			const map = TEST_MAP;

			const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
				if (value === "one") {
					return TraverseBreak;
				}
				return TraverseContinue;
			});

			traverse(map, visitor);

			expect(visitor).toHaveBeenCalledTimes(6);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				map,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				100,
				expect.objectContaining({
					parent: map,
					key: { kind: "map", key: "key1" },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				3,
				200,
				expect.objectContaining({
					parent: map,
					key: { kind: "map", key: "key2" },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				4,
				map.get("key3"),
				expect.objectContaining({
					parent: map,
					key: { kind: "map", key: "key3" },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				5,
				"one",
				expect.objectContaining({
					parent: map.get("key3"),
					key: { kind: "map", key: [11, 12] },
					parentPath: [{ kind: "map", key: "key3" }],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				6,
				400,
				expect.objectContaining({
					parent: map,
					key: { kind: "map", key: "key4" },
					parentPath: [],
				}),
			);
		});

		it("respects TraverseHalt", () => {
			const map = TEST_MAP;

			const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
				if (value === "one") {
					return TraverseHalt;
				}
				return TraverseContinue;
			});

			traverse(map, visitor);

			expect(visitor).toHaveBeenCalledTimes(5);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				map,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				100,
				expect.objectContaining({
					parent: map,
					key: { kind: "map", key: "key1" },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				3,
				200,
				expect.objectContaining({
					parent: map,
					key: { kind: "map", key: "key2" },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				4,
				map.get("key3"),
				expect.objectContaining({
					parent: map,
					key: { kind: "map", key: "key3" },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				5,
				"one",
				expect.objectContaining({
					parent: map.get("key3"),
					key: { kind: "map", key: [11, 12] },
					parentPath: [{ kind: "map", key: "key3" }],
				}),
			);
		});
	});

	describe("Set", () => {
		it("visits all values", () => {
			const set = TEST_SET;

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockImplementation(() => TraverseContinue);

			traverse(set, visitor);

			expect(visitor).toHaveBeenCalledTimes(7);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				set,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				10,
				expect.objectContaining({
					parent: set,
					key: { kind: "set", value: 10 },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				3,
				20,
				expect.objectContaining({
					parent: set,
					key: { kind: "set", value: 20 },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				4,
				new Set<number>([1, 2]),
				expect.objectContaining({
					parent: set,
					key: { kind: "set", value: new Set<number>([1, 2]) },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				5,
				1,
				expect.objectContaining({
					parent: new Set<number>([1, 2]),
					key: { kind: "set", value: 1 },
					parentPath: [{ kind: "set", value: new Set<number>([1, 2]) }],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				6,
				2,
				expect.objectContaining({
					parent: new Set<number>([1, 2]),
					key: { kind: "set", value: 2 },
					parentPath: [{ kind: "set", value: new Set<number>([1, 2]) }],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				7,
				30,
				expect.objectContaining({
					parent: set,
					key: { kind: "set", value: 30 },
					parentPath: [],
				}),
			);
		});

		it("skips set values when visitSetValues is false", () => {
			const set = TEST_SET;

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockImplementation(() => TraverseContinue);

			traverse(set, visitor, { traverseSets: false });

			expect(visitor).toHaveBeenCalledTimes(1);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				set,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
		});

		it("skips primitive values when visitPrimitives is false", () => {
			const set = TEST_SET;

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockImplementation(() => TraverseContinue);

			traverse(set, visitor, { visitPrimitives: false });
			expect(visitor).toHaveBeenCalledTimes(2);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				set,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				new Set<number>([1, 2]),
				expect.objectContaining({
					parent: set,
					key: { kind: "set", value: new Set<number>([1, 2]) },
					parentPath: [],
				}),
			);
		});

		it("respects TraverseBreak", () => {
			const set = TEST_SET;

			const breakValue = Array.from(set)[2]; // the Set [1, 2]
			const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
				if (value === breakValue) {
					return TraverseBreak;
				}
				return TraverseContinue;
			});

			traverse(set, visitor);
			expect(visitor).toHaveBeenCalledTimes(4);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				set,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				10,
				expect.objectContaining({
					parent: set,
					key: { kind: "set", value: 10 },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				3,
				20,
				expect.objectContaining({
					parent: set,
					key: { kind: "set", value: 20 },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				4,
				new Set<number>([1, 2]),
				expect.objectContaining({
					parent: set,
					key: { kind: "set", value: new Set<number>([1, 2]) },
					parentPath: [],
				}),
			);
		});

		it("respects TraverseBreak in nested sets", () => {
			const set = TEST_SET;

			const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
				if (value === 1) {
					return TraverseBreak;
				}
				return TraverseContinue;
			});

			traverse(set, visitor);
			expect(visitor).toHaveBeenCalledTimes(6);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				set,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				10,
				expect.objectContaining({
					parent: set,
					key: { kind: "set", value: 10 },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				3,
				20,
				expect.objectContaining({
					parent: set,
					key: { kind: "set", value: 20 },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				4,
				new Set<number>([1, 2]),
				expect.objectContaining({
					parent: set,
					key: { kind: "set", value: new Set<number>([1, 2]) },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				5,
				1,
				expect.objectContaining({
					parent: new Set<number>([1, 2]),
					key: { kind: "set", value: 1 },
					parentPath: [{ kind: "set", value: new Set<number>([1, 2]) }],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				6,
				30,
				expect.objectContaining({
					parent: set,
					key: { kind: "set", value: 30 },
					parentPath: [],
				}),
			);
		});

		it("respects TraverseHalt", () => {
			const set = TEST_SET;

			const visitor = vi.fn<TraverseVisitor>().mockImplementation((value) => {
				if (value === 1) {
					return TraverseHalt;
				}
				return TraverseContinue;
			});

			traverse(set, visitor);
			expect(visitor).toHaveBeenCalledTimes(5);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				set,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				10,
				expect.objectContaining({
					parent: set,
					key: { kind: "set", value: 10 },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				3,
				20,
				expect.objectContaining({
					parent: set,
					key: { kind: "set", value: 20 },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				4,
				new Set<number>([1, 2]),
				expect.objectContaining({
					parent: set,
					key: { kind: "set", value: new Set<number>([1, 2]) },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				5,
				1,
				expect.objectContaining({
					parent: new Set<number>([1, 2]),
					key: { kind: "set", value: 1 },
					parentPath: [{ kind: "set", value: new Set<number>([1, 2]) }],
				}),
			);
		});
	});

	describe("complex nested structures", () => {
		it("visits all values", () => {
			const complexObject = {
				arr: [
					1,
					{
						map: new Map<string, unknown>([
							["set", new Set<unknown>([true, { val: "end" }])],
						]),
					},
				],
			} as const;

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockImplementation(() => TraverseContinue);

			traverse(complexObject, visitor);

			expect(visitor).toHaveBeenCalledTimes(9);
			expect(visitor).toHaveBeenNthCalledWith(
				1,
				complexObject,
				expect.objectContaining({
					parent: undefined,
					key: null,
					parentPath: null,
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				2,
				complexObject.arr,
				expect.objectContaining({
					parent: complexObject,
					key: { kind: "object", property: "arr", prototype: complexObject },
					parentPath: [],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				3,
				1,
				expect.objectContaining({
					parent: complexObject.arr,
					key: { kind: "array", index: 0 },
					parentPath: [
						{ kind: "object", property: "arr", prototype: complexObject },
					],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				4,
				complexObject.arr[1],
				expect.objectContaining({
					parent: complexObject.arr,
					key: { kind: "array", index: 1 },
					parentPath: [
						{ kind: "object", property: "arr", prototype: complexObject },
					],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				5,
				complexObject.arr[1].map,
				expect.objectContaining({
					parent: complexObject.arr[1],
					key: {
						kind: "object",
						property: "map",
						prototype: complexObject.arr[1],
					},
					parentPath: [
						{ kind: "object", property: "arr", prototype: complexObject },
						{ kind: "array", index: 1 },
					],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				6,
				complexObject.arr[1].map.get("set"),
				expect.objectContaining({
					parent: complexObject.arr[1].map,
					key: { kind: "map", key: "set" },
					parentPath: [
						{ kind: "object", property: "arr", prototype: complexObject },
						{ kind: "array", index: 1 },
						{
							kind: "object",
							property: "map",
							prototype: complexObject.arr[1],
						},
					],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				7,
				true,
				expect.objectContaining({
					parent: complexObject.arr[1].map.get("set"),
					key: { kind: "set", value: true },
					parentPath: [
						{ kind: "object", property: "arr", prototype: complexObject },
						{ kind: "array", index: 1 },
						{
							kind: "object",
							property: "map",
							prototype: complexObject.arr[1],
						},
						{ kind: "map", key: "set" },
					],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				8,
				{ val: "end" },
				expect.objectContaining({
					parent: complexObject.arr[1].map.get("set"),
					key: { kind: "set", value: { val: "end" } },
					parentPath: [
						{ kind: "object", property: "arr", prototype: complexObject },
						{ kind: "array", index: 1 },
						{
							kind: "object",
							property: "map",
							prototype: complexObject.arr[1],
						},
						{ kind: "map", key: "set" },
					],
				}),
			);
			expect(visitor).toHaveBeenNthCalledWith(
				9,
				"end",
				expect.objectContaining({
					parent: { val: "end" },
					key: { kind: "object", property: "val", prototype: { val: "end" } },
					parentPath: [
						{ kind: "object", property: "arr", prototype: complexObject },
						{ kind: "array", index: 1 },
						{
							kind: "object",
							property: "map",
							prototype: complexObject.arr[1],
						},
						{ kind: "map", key: "set" },
						{ kind: "set", value: { val: "end" } },
					],
				}),
			);
		});
	});

	describe("value transformation", () => {
		it("should replace and recurse into replacement value", () => {
			const obj = { a: 1, b: { c: 2 } };
			const result = traverse(obj, (value, context) => {
				if (value === 1) {
					context.replace({ nested: 100 });
				}
				if (value === 100) {
					context.replace(1000);
				}
				return TraverseContinue;
			});

			expect(result).toEqual({ a: { nested: 1000 }, b: { c: 2 } });
		});

		it("should transform arrays", () => {
			const arr = [1, 2, 3, 4];
			const result = traverse(arr, (value, context) => {
				if (typeof value === "number") {
					context.replace(value * 2);
				}
				return TraverseContinue;
			});

			expect(result).toEqual([2, 4, 6, 8]);
		});

		it("should transform Maps", () => {
			const map = new Map([
				["a", 1],
				["b", 2],
			]);
			const result = traverse(map, (value, context) => {
				if (typeof value === "number") {
					context.replace(value * 10);
				}
				return TraverseContinue;
			});

			expect(result).toEqual(
				new Map([
					["a", 10],
					["b", 20],
				]),
			);
		});

		it("should transform Sets", () => {
			const set = new Set([1, 2, 3]);
			const result = traverse(set, (value, context) => {
				if (typeof value === "number") {
					context.replace(value * 10);
				}
				return TraverseContinue;
			});

			expect(result).toEqual(new Set([10, 20, 30]));
		});

		it("should allow returning non-control symbols as values", () => {
			const customSymbol = Symbol("custom");
			const obj = { a: 1 };
			const result = traverse(obj, (value, context) => {
				if (value === 1) {
					context.replace(customSymbol);
				}
				return TraverseContinue;
			});

			expect(result).toEqual({ a: customSymbol });
		});
	});

	describe("container replacement", () => {
		it("should replace array with object", () => {
			const obj = { data: [1, 2, 3] };
			const visitor = vi.fn<TraverseVisitor>((value, context) => {
				if (Array.isArray(value)) {
					context.replace({ converted: "from array" });
				}
				return TraverseContinue;
			});

			const result = traverse(obj, visitor);

			expect(result).toEqual({ data: { converted: "from array" } });
			// Replaced containers are not re-visited, but their contents are traversed
			expect(visitor).toHaveBeenCalledWith("from array", expect.anything());
		});

		it("should replace array with Map", () => {
			const obj = { data: [1, 2, 3] };
			const visitor = vi.fn<TraverseVisitor>((value, context) => {
				if (Array.isArray(value)) {
					context.replace(new Map([["key", "value"]]));
				}
				return TraverseContinue;
			});

			const result = traverse(obj, visitor);

			expect(result).toEqual({ data: new Map([["key", "value"]]) });
			// Replaced containers are not re-visited, but their contents are traversed
			expect(visitor).toHaveBeenCalledWith("value", expect.anything());
		});

		it("should replace array with Set", () => {
			const obj = { data: [1, 2, 3] };
			const visitor = vi.fn<TraverseVisitor>((value, context) => {
				if (Array.isArray(value)) {
					context.replace(new Set(["a", "b"]));
				}
				return TraverseContinue;
			});

			const result = traverse(obj, visitor);

			expect(result).toEqual({ data: new Set(["a", "b"]) });
			// Replaced containers are not re-visited, but their contents are traversed
			expect(visitor).toHaveBeenCalledWith("a", expect.anything());
			expect(visitor).toHaveBeenCalledWith("b", expect.anything());
		});

		it("should replace array with primitive", () => {
			const obj = { data: [1, 2, 3] };
			const visitor = vi.fn<TraverseVisitor>((value, context) => {
				if (Array.isArray(value)) {
					context.replace("replaced");
				}
				return TraverseContinue;
			});

			const result = traverse(obj, visitor);

			expect(result).toEqual({ data: "replaced" });
			// Should NOT visit the replaced primitive value by default (visitPrimitive: false)
			expect(visitor).not.toHaveBeenCalledWith("replaced", expect.anything());
		});

		it("should replace object with array", () => {
			const obj = { data: { a: 1, b: 2 } };
			const visitor = vi.fn<TraverseVisitor>((_, context) => {
				if (context.key?.kind === "object" && context.key.property === "data") {
					context.replace([10, 20, 30]);
				}
				return TraverseContinue;
			});

			const result = traverse(obj, visitor);

			expect(result).toEqual({ data: [10, 20, 30] });
			// Replaced containers are not re-visited, but their contents are traversed
			expect(visitor).toHaveBeenCalledWith(10, expect.anything());
			expect(visitor).toHaveBeenCalledWith(20, expect.anything());
			expect(visitor).toHaveBeenCalledWith(30, expect.anything());
		});

		it("should replace object with Map", () => {
			const obj = { data: { a: 1, b: 2 } };
			const visitor = vi.fn<TraverseVisitor>((_, context) => {
				if (context.key?.kind === "object" && context.key.property === "data") {
					context.replace(new Map([["x", 100]]));
				}
				return TraverseContinue;
			});

			const result = traverse(obj, visitor);

			expect(result).toEqual({ data: new Map([["x", 100]]) });
			// Replaced containers are not re-visited, but their contents are traversed
			expect(visitor).toHaveBeenCalledWith(100, expect.anything());
		});

		it("should replace object with Set", () => {
			const obj = { data: { a: 1, b: 2 } };
			const visitor = vi.fn<TraverseVisitor>((_, context) => {
				if (context.key?.kind === "object" && context.key.property === "data") {
					context.replace(new Set([1, 2, 3]));
				}
				return TraverseContinue;
			});

			const result = traverse(obj, visitor);

			expect(result).toEqual({ data: new Set([1, 2, 3]) });
			// Replaced containers are not re-visited, but their contents are traversed
			expect(visitor).toHaveBeenCalledWith(1, expect.anything());
			expect(visitor).toHaveBeenCalledWith(2, expect.anything());
			expect(visitor).toHaveBeenCalledWith(3, expect.anything());
		});

		it("should replace object with primitive", () => {
			const obj = { data: { a: 1, b: 2 } };
			const visitor = vi.fn<TraverseVisitor>((_, context) => {
				if (context.key?.kind === "object" && context.key.property === "data") {
					context.replace(42);
				}
				return TraverseContinue;
			});

			const result = traverse(obj, visitor);

			expect(result).toEqual({ data: 42 });
			// Should NOT visit the replaced primitive value by default (visitPrimitive: false)
			expect(visitor).not.toHaveBeenCalledWith(42, expect.anything());
		});

		it("should replace Map with array", () => {
			const obj = { data: new Map([["a", 1]]) };
			const visitor = vi.fn<TraverseVisitor>((value, context) => {
				if (value instanceof Map) {
					context.replace([100, 200]);
				}
				return TraverseContinue;
			});

			const result = traverse(obj, visitor);

			expect(result).toEqual({ data: [100, 200] });
			// Replaced containers are not re-visited, but their contents are traversed
			expect(visitor).toHaveBeenCalledWith(100, expect.anything());
			expect(visitor).toHaveBeenCalledWith(200, expect.anything());
		});

		it("should replace Map with object", () => {
			const obj = { data: new Map([["a", 1]]) };
			const visitor = vi.fn<TraverseVisitor>((value, context) => {
				if (value instanceof Map) {
					context.replace({ converted: true });
				}
				return TraverseContinue;
			});

			const result = traverse(obj, visitor);

			expect(result).toEqual({ data: { converted: true } });
			// Replaced containers are not re-visited, but their contents are traversed
			expect(visitor).toHaveBeenCalledWith(true, expect.anything());
		});

		it("should replace Map with Set", () => {
			const obj = { data: new Map([["a", 1]]) };
			const visitor = vi.fn<TraverseVisitor>((value, context) => {
				if (value instanceof Map) {
					context.replace(new Set(["x", "y"]));
				}
				return TraverseContinue;
			});

			const result = traverse(obj, visitor);

			expect(result).toEqual({ data: new Set(["x", "y"]) });
			// Replaced containers are not re-visited, but their contents are traversed
			expect(visitor).toHaveBeenCalledWith("x", expect.anything());
			expect(visitor).toHaveBeenCalledWith("y", expect.anything());
		});

		it("should replace Map with primitive", () => {
			const obj = { data: new Map([["a", 1]]) };
			const visitor = vi.fn<TraverseVisitor>((value, context) => {
				if (value instanceof Map) {
					context.replace("map replaced");
				}
				return TraverseContinue;
			});

			const result = traverse(obj, visitor);

			expect(result).toEqual({ data: "map replaced" });
			// Should NOT visit the replaced primitive value by default (visitPrimitive: false)
			expect(visitor).not.toHaveBeenCalledWith(
				"map replaced",
				expect.anything(),
			);
		});

		it("should replace Set with array", () => {
			const obj = { data: new Set([1, 2, 3]) };
			const visitor = vi.fn<TraverseVisitor>((value, context) => {
				if (value instanceof Set) {
					context.replace([10, 20]);
				}
				return TraverseContinue;
			});

			const result = traverse(obj, visitor);

			expect(result).toEqual({ data: [10, 20] });
			// Replaced containers are not re-visited, but their contents are traversed
			expect(visitor).toHaveBeenCalledWith(10, expect.anything());
			expect(visitor).toHaveBeenCalledWith(20, expect.anything());
		});

		it("should replace Set with object", () => {
			const obj = { data: new Set([1, 2, 3]) };
			const visitor = vi.fn<TraverseVisitor>((value, context) => {
				if (value instanceof Set) {
					context.replace({ from: "set" });
				}
				return TraverseContinue;
			});

			const result = traverse(obj, visitor);

			expect(result).toEqual({ data: { from: "set" } });
			// Replaced containers are not re-visited, but their contents are traversed
			expect(visitor).toHaveBeenCalledWith("set", expect.anything());
		});

		it("should replace Set with Map", () => {
			const obj = { data: new Set([1, 2, 3]) };
			const visitor = vi.fn<TraverseVisitor>((value, context) => {
				if (value instanceof Set) {
					context.replace(new Map([["k", "v"]]));
				}
				return TraverseContinue;
			});

			const result = traverse(obj, visitor);

			expect(result).toEqual({ data: new Map([["k", "v"]]) });
			// Replaced containers are not re-visited, but their contents are traversed
			expect(visitor).toHaveBeenCalledWith("v", expect.anything());
		});

		it("should replace Set with primitive", () => {
			const obj = { data: new Set([1, 2, 3]) };
			const visitor = vi.fn<TraverseVisitor>((value, context) => {
				if (value instanceof Set) {
					context.replace(null);
				}
				return TraverseContinue;
			});

			const result = traverse(obj, visitor);

			expect(result).toEqual({ data: null });
			// Should NOT visit the replaced primitive value by default (visitPrimitive: false)
			expect(visitor).not.toHaveBeenCalledWith(null, expect.anything());
		});

		it("should replace primitive with array", () => {
			const obj = { data: 42 };
			const visitor = vi.fn<TraverseVisitor>((value, context) => {
				if (value === 42) {
					context.replace([1, 2, 3]);
				}
				return TraverseContinue;
			});

			const result = traverse(obj, visitor, { visitPrimitives: true });

			expect(result).toEqual({ data: [1, 2, 3] });
			// Should visit the original primitive value
			expect(visitor).toHaveBeenCalledWith(42, expect.anything());
			// Replaced containers are not re-visited, but their contents are traversed
			expect(visitor).toHaveBeenCalledWith(1, expect.anything());
			expect(visitor).toHaveBeenCalledWith(2, expect.anything());
			expect(visitor).toHaveBeenCalledWith(3, expect.anything());
		});

		it("should replace primitive with object", () => {
			const obj = { data: "text" };
			const visitor = vi.fn<TraverseVisitor>((value, context) => {
				if (value === "text") {
					context.replace({ expanded: true });
				}
				return TraverseContinue;
			});

			const result = traverse(obj, visitor, { visitPrimitives: true });

			expect(result).toEqual({ data: { expanded: true } });
			// Should visit the original primitive value
			expect(visitor).toHaveBeenCalledWith("text", expect.anything());
			// Replaced containers not re-visited, but their contents are traversed
			expect(visitor).toHaveBeenCalledWith(true, expect.anything());
		});

		it("should replace primitive with Map", () => {
			const obj = { data: 123 };
			const visitor = vi.fn<TraverseVisitor>((value, context) => {
				if (value === 123) {
					context.replace(new Map([["key", "value"]]));
				}
				return TraverseContinue;
			});

			const result = traverse(obj, visitor, { visitPrimitives: true });

			expect(result).toEqual({ data: new Map([["key", "value"]]) });
			// Should visit the original primitive value
			expect(visitor).toHaveBeenCalledWith(123, expect.anything());
			// Replaced containers not re-visited, but their contents are traversed
			expect(visitor).toHaveBeenCalledWith("value", expect.anything());
		});

		it("should replace primitive with Set", () => {
			const obj = { data: true };
			const visitor = vi.fn<TraverseVisitor>((value, context) => {
				if (value === true) {
					context.replace(new Set([1, 2]));
				}
				return TraverseContinue;
			});

			const result = traverse(obj, visitor, { visitPrimitives: true });

			expect(result).toEqual({ data: new Set([1, 2]) });
			// Should visit the original primitive value
			expect(visitor).toHaveBeenCalledWith(true, expect.anything());
			// Replaced containers not re-visited, but their contents are traversed
			expect(visitor).toHaveBeenCalledWith(1, expect.anything());
			expect(visitor).toHaveBeenCalledWith(2, expect.anything());
		});

		it("should recurse into replaced container", () => {
			const obj = { data: [1, 2, 3] };
			const result = traverse(obj, (value, context) => {
				if (Array.isArray(value) && value[0] === 1) {
					context.replace({ nested: { value: 10 } });
				}
				if (value === 10) {
					context.replace(100);
				}
				return TraverseContinue;
			});

			expect(result).toEqual({ data: { nested: { value: 100 } } });
		});

		it("should handle nested container replacements", () => {
			const obj = {
				level1: {
					level2: [1, 2, 3],
				},
			};
			const result = traverse(obj, (value, context) => {
				if (
					context.key?.kind === "object" &&
					context.key.property === "level2"
				) {
					context.replace(new Map([["converted", new Set([10, 20])]]));
				}
				if (value instanceof Set) {
					context.replace([100, 200]);
				}
				return TraverseContinue;
			});

			expect(result).toEqual({
				level1: {
					level2: new Map([["converted", [100, 200]]]),
				},
			});
		});

		it("should replace container in array", () => {
			const arr = [1, { a: 2 }, 3];
			const result = traverse(arr, (_, context) => {
				if (context.key?.kind === "array" && context.key.index === 1) {
					context.replace(new Map([["key", "val"]]));
				}
				return TraverseContinue;
			});

			expect(result).toEqual([1, new Map([["key", "val"]]), 3]);
		});

		it("should replace container in Map", () => {
			const map = new Map<string, number[] | string>([
				["key1", [1, 2, 3]],
				["key2", "value"],
			]);
			const result = traverse(map, (value, context) => {
				if (Array.isArray(value)) {
					context.replace(new Set(value));
				}
				return TraverseContinue;
			});

			expect(result).toEqual(
				new Map<string, Set<number> | string>([
					["key1", new Set([1, 2, 3])],
					["key2", "value"],
				]),
			);
		});

		it("should replace container in Set", () => {
			const set = new Set([1, [2, 3], 4]);
			const result = traverse(set, (value, context) => {
				if (Array.isArray(value)) {
					context.replace(new Map([["x", 10]]));
				}
				return TraverseContinue;
			});

			expect(result).toEqual(new Set([1, new Map([["x", 10]]), 4]));
		});
	});

	describe("value removal", () => {
		it("should remove properties from objects when TraverseRemove is returned", () => {
			const obj = { a: 1, b: 2, c: 3 };
			const result = traverse(obj, (value, context) => {
				if (value === 2) {
					context.remove();
				}
				return TraverseContinue;
			});

			expect(result).toEqual({ a: 1, c: 3 });
		});

		it("should remove items from arrays when TraverseRemove is returned", () => {
			const arr = [1, 2, 3, 4];
			const result = traverse(arr, (value, context) => {
				if (value === 2 || value === 4) {
					context.remove();
				}
				return TraverseContinue;
			});

			expect(result).toEqual([1, 3]);
		});

		it("should remove entries from Maps when TraverseRemove is returned", () => {
			const map = new Map([
				["a", 1],
				["b", 2],
				["c", 3],
			]);
			const result = traverse(map, (value, context) => {
				if (value === 2) {
					context.remove();
				}
				return TraverseContinue;
			});

			expect(result).toEqual(
				new Map([
					["a", 1],
					["c", 3],
				]),
			);
		});

		it("should remove values from Sets when TraverseRemove is returned", () => {
			const set = new Set([1, 2, 3, 4]);
			const result = traverse(set, (value, context) => {
				if (value === 2 || value === 4) {
					context.remove();
				}
				return TraverseContinue;
			});

			expect(result).toEqual(new Set([1, 3]));
		});

		it("should remove nested structures", () => {
			const obj = { a: 1, b: { c: 2, d: 3 }, e: 4 };
			const result = traverse(obj, (value, context) => {
				if (typeof value === "object" && value !== null && "c" in value) {
					context.remove();
				}
				return TraverseContinue;
			});

			expect(result).toEqual({ a: 1, e: 4 });
		});
	});

	describe("TraverseSkip", () => {
		it("should keep value and skip recursion", () => {
			const obj = { a: 1, b: { c: 2, d: 3 } };
			const visitor = vi.fn<TraverseVisitor>((value) => {
				if (typeof value === "object" && value !== null && "c" in value) {
					return TraverseSkip;
				}
				return TraverseContinue;
			});

			const result = traverse(obj, visitor);

			expect(result).toEqual({ a: 1, b: { c: 2, d: 3 } });
			// Should not visit c or d properties
			expect(visitor).not.toHaveBeenCalledWith(2, expect.anything());
			expect(visitor).not.toHaveBeenCalledWith(3, expect.anything());
		});

		it("should work with arrays", () => {
			const arr = [1, [2, 3], 4];
			const visitor = vi.fn<TraverseVisitor>((value) => {
				if (Array.isArray(value) && value[0] === 2) {
					return TraverseSkip;
				}
				return TraverseContinue;
			});

			const result = traverse(arr, visitor);

			expect(result).toEqual([1, [2, 3], 4]);
			// Should not visit 2 or 3
			expect(visitor).not.toHaveBeenCalledWith(2, expect.anything());
			expect(visitor).not.toHaveBeenCalledWith(3, expect.anything());
		});
	});

	describe("combined transformations", () => {
		it("should combine transformation and removal", () => {
			const obj = { a: 1, b: 2, c: 3, d: 4 };
			const result = traverse(obj, (value, context) => {
				if (value === 2) {
					context.remove();
				} else if (typeof value === "number") {
					context.replace(value * 10);
				}
				return TraverseContinue;
			});

			expect(result).toEqual({ a: 10, c: 30, d: 40 });
		});

		it("should handle complex nested transformations", () => {
			const data = {
				users: [
					{ name: "Alice", age: 30, internal: true },
					{ name: "Bob", age: 25, internal: false },
					{ name: "Charlie", age: 35, internal: true },
				],
			};

			const result = traverse(data, (value, context) => {
				// Remove internal users
				if (
					typeof value === "object" &&
					value !== null &&
					"internal" in value &&
					value.internal === true
				) {
					context.remove();
				}
				// Remove internal property
				if (
					context.key?.kind === "object" &&
					context.key.property === "internal"
				) {
					context.remove();
				}
				return TraverseContinue;
			});

			expect(result).toEqual({
				users: [{ name: "Bob", age: 25 }],
			});
		});
	});

	describe("edge cases", () => {
		it("should handle null values", () => {
			const input = { a: null, b: { c: null } };

			const result = traverse(input, () => TraverseContinue);

			expect(result).toEqual(input);
		});

		it("should handle empty objects and arrays with undefined return", () => {
			const input = { empty: {}, arr: [] };

			const result = traverse(input, () => TraverseContinue);

			expect(result).toEqual(input);
		});

		it.skip("should handle circular references without infinite loop", () => {
			const circular: { a: number; self?: unknown } = { a: 1 };
			circular.self = circular;

			// This should not throw or hang
			const visitCount = { count: 0 };
			traverse(circular, () => {
				visitCount.count++;
				if (visitCount.count > 100) {
					return TraverseHalt; // Safety cutoff
				}
				return TraverseContinue;
			});

			expect(visitCount.count).toBeGreaterThan(2);
			expect(visitCount.count).toBeLessThan(100);
		});

		it("should handle NaN values", () => {
			const input = { a: Number.NaN, b: 2 };

			const result = traverse(input, (value, context) => {
				if (typeof value === "number" && Number.isNaN(value)) {
					context.replace(0); // Transform NaN to 0
				}
				return TraverseContinue;
			});

			expect(result).toEqual({ a: 0, b: 2 });
		});

		it("should handle Infinity values", () => {
			const input = {
				a: Number.POSITIVE_INFINITY,
				b: Number.NEGATIVE_INFINITY,
			};

			const result = traverse(input, () => TraverseContinue);

			expect(result).toEqual(input);
		});

		it("should handle BigInt values", () => {
			const input = { a: BigInt(123), b: 2 };

			const result = traverse(input, (value, context) => {
				if (typeof value === "bigint") {
					context.replace(value * BigInt(2));
				}
				return TraverseContinue;
			});

			expect(result).toEqual({ a: BigInt(246), b: 2 });
		});

		it("should handle Date objects", () => {
			const date = new Date("2026-01-11");
			const input = { created: date };

			const result = traverse(input, () => TraverseContinue);

			expect(result).toEqual(input);
		});

		it("should handle RegExp objects", () => {
			const regex = /test/gi;
			const input = { pattern: regex };

			const result = traverse(input, () => TraverseContinue);

			expect(result).toEqual(input);
		});

		it("should handle Error objects", () => {
			const error = new Error("test error");
			const input = { error };

			const result = traverse(input, () => TraverseContinue);

			expect(result).toEqual(input);
		});

		it("should handle typed arrays", () => {
			const typedArray = new Uint8Array([1, 2, 3]);
			const input = { buffer: typedArray };

			const result = traverse(input, () => TraverseContinue);

			expect(result).toEqual(input);
		});

		it("should handle deeply nested structures", () => {
			let deep: { value?: number; nested?: unknown; level?: number } = {
				value: 0,
			};
			for (let i = 0; i < 50; i++) {
				deep = { nested: deep, level: i };
			}

			const result = traverse(deep, (value, context) => {
				if (typeof value === "number") {
					context.replace(value + 1);
				}
				return TraverseContinue;
			});

			// Should traverse and transform all number values
			type DeepNested = { value?: number; nested?: DeepNested; level?: number };
			let current = result as DeepNested;
			for (let i = 49; i >= 0; i--) {
				expect(current.level).toBe(i + 1);
				current = current.nested as DeepNested;
			}
			expect(current.value).toBe(1);
		});

		it("should handle objects with prototype chain", () => {
			const parent = { inherited: "value" };
			const child = Object.create(parent);
			child.own = "property";

			const result = traverse(child, () => TraverseContinue);

			expect(result).toBe(child); // Mutates in-place
			expect(result).toHaveProperty("own", "property");
			// Inherited properties are visited but not own properties
			expect(Object.hasOwn(result as object, "inherited")).toBe(false);
		});

		it("should handle objects with getters/setters", () => {
			let backingValue = 42;
			const input = {
				get value() {
					return backingValue;
				},
				set value(v: number) {
					backingValue = v;
				},
			};

			const result = traverse(input, (value, context) => {
				if (typeof value === "number") {
					context.replace(value * 2);
				}
				return TraverseContinue;
			});

			expect(result).toBe(input); // Mutates in-place
			expect((result as typeof input).value).toBe(84); // Setter was called
			expect(backingValue).toBe(84); // Backing value changed via setter
		});

		it("should handle WeakMap and WeakSet gracefully", () => {
			const obj = { a: 1 };
			const weakMap = new WeakMap([[obj, "value"]]);
			const weakSet = new WeakSet([obj]);
			const input = { weakMap, weakSet };

			// WeakMap and WeakSet are not iterable, should be treated as opaque objects
			const result = traverse(input, () => TraverseContinue);

			expect(result).toEqual(input);
		});

		it("should handle boolean primitive wrapper objects", () => {
			const input = { wrapped: new Boolean(true), primitive: false };

			const result = traverse(input, () => TraverseContinue);

			expect(result).toEqual(input);
		});

		it("should handle string primitive wrapper objects", () => {
			const input = { wrapped: new String("test"), primitive: "test" };

			const result = traverse(input, () => TraverseContinue);

			expect(result).toEqual(input);
		});

		it("should handle number primitive wrapper objects", () => {
			const input = { wrapped: new Number(42), primitive: 42 };

			const result = traverse(input, () => TraverseContinue);

			expect(result).toEqual(input);
		});

		it("should handle zero values", () => {
			const input = { positive: 0, negative: -0 };

			const result = traverse(input, () => TraverseContinue);

			expect(result).toEqual(input);
			type ZeroResult = { positive: number; negative: number };
			expect(Object.is((result as ZeroResult).positive, 0)).toBe(true);
			expect(Object.is((result as ZeroResult).negative, -0)).toBe(true);
		});

		it("should handle empty strings", () => {
			const input = { empty: "", nonempty: "test" };

			const result = traverse(input, () => TraverseContinue);

			expect(result).toEqual(input);
		});

		it("should handle false and true values", () => {
			const input = { t: true, f: false };

			const result = traverse(input, () => TraverseContinue);

			expect(result).toEqual(input);
		});

		it("should handle mixed Map key types", () => {
			const objKey = { id: 1 };
			const map = new Map<string | number | { id: number } | boolean, number>([
				["string", 1],
				[42, 2],
				[objKey, 3],
				[true, 4],
			]);

			const result = traverse(map, () => TraverseContinue, {
				traverseMapKeys: true,
			});

			expect(result).toEqual(map);
		});

		it("should handle Set with mixed types", () => {
			const set = new Set([1, "string", true, null, undefined, { obj: 1 }]);

			const result = traverse(set, () => TraverseContinue, {
				traverseSets: true,
			});

			expect(result).toEqual(set);
		});

		it("should preserve array holes when not visiting indices", () => {
			// biome-ignore lint/suspicious/noSparseArray: test
			const sparse = [1, , 3];

			const result = traverse(sparse, () => TraverseContinue, {
				traverseArrays: false,
			});

			expect(result).toHaveLength(3);
			expect(1 in (result as number[])).toBe(false); // Hole should be preserved
		});

		it("should handle functions as object properties", () => {
			const input = {
				method: () => "hello",
				data: 42,
			};

			const result = traverse(input, () => TraverseContinue);

			expect(result).toEqual(input);
			type FuncResult = { method: () => string; data: number };
			expect(typeof (result as FuncResult).method).toBe("function");
		});

		it("should handle Symbol properties when includeSymbolKeys is true", () => {
			const sym = Symbol("test");
			const input = { [sym]: "symbol value", normal: "normal value" };

			const result = traverse(input, () => TraverseContinue, {
				includeSymbolKeys: true,
			});

			expect(result).toEqual(input);
			type SymResult = { [key: symbol]: string; normal: string };
			expect((result as SymResult)[sym]).toBe("symbol value");
		});

		it("should transform values at different nesting levels independently", () => {
			const input = {
				level1: 1,
				nested: {
					level2: 2,
					deep: {
						level3: 3,
					},
				},
			};

			const result = traverse(input, (value, context) => {
				if (typeof value === "number") {
					const depth =
						(context.parentPath?.length ?? 0) + (context.key ? 1 : 0);
					context.replace(value * 10 ** depth);
				}
				return TraverseContinue;
			});

			expect(result).toEqual({
				level1: 10,
				nested: {
					level2: 200,
					deep: {
						level3: 3000,
					},
				},
			});
		});
	});

	describe("primitive-like objects", () => {
		it("should not traverse into Date objects", () => {
			const date = new Date("2026-01-11");
			const input = { created: date, updated: new Date("2026-01-12") };

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockReturnValue(TraverseContinue);
			const result = traverse(input, visitor);

			// Visitor should be called for: input object, "created" date, "updated" date
			// But NOT for Date internal properties
			expect(visitor).toHaveBeenCalledTimes(3);
			expect(visitor).toHaveBeenCalledWith(input, expect.any(Object));
			expect(visitor).toHaveBeenCalledWith(
				date,
				expect.objectContaining({
					key: { kind: "object", property: "created", prototype: input },
				}),
			);
			expect(visitor).toHaveBeenCalledWith(
				input.updated,
				expect.objectContaining({
					key: { kind: "object", property: "updated", prototype: input },
				}),
			);
			expect(result).toEqual(input);
			expect((result as typeof input).created).toBe(date);
		});

		it("should not traverse into RegExp objects", () => {
			const regex = /test/gi;
			const input = { pattern: regex, anotherPattern: /foo/i };

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockReturnValue(TraverseContinue);
			const result = traverse(input, visitor);

			// Visitor should be called for: input object, "pattern" regex, "anotherPattern" regex
			// But NOT for RegExp internal properties
			expect(visitor).toHaveBeenCalledTimes(3);
			expect(visitor).toHaveBeenCalledWith(input, expect.any(Object));
			expect(visitor).toHaveBeenCalledWith(regex, expect.any(Object));
			expect(visitor).toHaveBeenCalledWith(
				input.anotherPattern,
				expect.any(Object),
			);
			expect(result).toEqual(input);
			expect((result as typeof input).pattern).toBe(regex);
		});

		it("should not traverse into Error objects", () => {
			const error = new Error("test error");
			const input = { error, otherError: new TypeError("type error") };

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockReturnValue(TraverseContinue);
			const result = traverse(input, visitor);

			// Visitor should be called for: input object, "error" Error, "otherError" TypeError
			// But NOT for Error internal properties (message, stack, etc.)
			expect(visitor).toHaveBeenCalledTimes(3);
			expect(visitor).toHaveBeenCalledWith(input, expect.any(Object));
			expect(visitor).toHaveBeenCalledWith(error, expect.any(Object));
			expect(visitor).toHaveBeenCalledWith(
				input.otherError,
				expect.any(Object),
			);
			expect(result).toEqual(input);
			expect((result as typeof input).error).toBe(error);
		});

		it("should not traverse into ArrayBuffer objects", () => {
			const buffer = new ArrayBuffer(16);
			const input = { buffer, otherBuffer: new ArrayBuffer(8) };

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockReturnValue(TraverseContinue);
			const result = traverse(input, visitor);

			// Visitor should be called for: input object, "buffer" ArrayBuffer, "otherBuffer" ArrayBuffer
			// But NOT for ArrayBuffer internal properties
			expect(visitor).toHaveBeenCalledTimes(3);
			expect(visitor).toHaveBeenCalledWith(input, expect.any(Object));
			expect(visitor).toHaveBeenCalledWith(buffer, expect.any(Object));
			expect(visitor).toHaveBeenCalledWith(
				input.otherBuffer,
				expect.any(Object),
			);
			expect(result).toEqual(input);
			expect((result as typeof input).buffer).toBe(buffer);
		});

		it("should not traverse into TypedArray objects (Uint8Array)", () => {
			const typedArray = new Uint8Array([1, 2, 3]);
			const input = { buffer: typedArray };

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockReturnValue(TraverseContinue);
			const result = traverse(input, visitor);

			// Visitor should be called for: input object, "buffer" Uint8Array
			// But NOT for array indices or internal properties
			expect(visitor).toHaveBeenCalledTimes(2);
			expect(visitor).toHaveBeenCalledWith(input, expect.any(Object));
			expect(visitor).toHaveBeenCalledWith(typedArray, expect.any(Object));
			expect(result).toEqual(input);
			expect((result as typeof input).buffer).toBe(typedArray);
		});

		it("should not traverse into TypedArray objects (Int32Array)", () => {
			const typedArray = new Int32Array([100, 200, 300]);
			const input = { data: typedArray };

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockReturnValue(TraverseContinue);
			const result = traverse(input, visitor);

			// Visitor should be called for: input object, "data" Int32Array
			// But NOT for array indices or internal properties
			expect(visitor).toHaveBeenCalledTimes(2);
			expect(visitor).toHaveBeenCalledWith(input, expect.any(Object));
			expect(visitor).toHaveBeenCalledWith(typedArray, expect.any(Object));
			expect(result).toEqual(input);
			expect((result as typeof input).data).toBe(typedArray);
		});

		it("should not traverse into DataView objects", () => {
			const buffer = new ArrayBuffer(16);
			const dataView = new DataView(buffer);
			const input = { view: dataView };

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockReturnValue(TraverseContinue);
			const result = traverse(input, visitor);

			// Visitor should be called for: input object, "view" DataView
			// But NOT for DataView internal properties
			expect(visitor).toHaveBeenCalledTimes(2);
			expect(visitor).toHaveBeenCalledWith(input, expect.any(Object));
			expect(visitor).toHaveBeenCalledWith(dataView, expect.any(Object));
			expect(result).toEqual(input);
			expect((result as typeof input).view).toBe(dataView);
		});

		it("should handle transformation of primitive-like objects", () => {
			const date = new Date("2026-01-11");
			const newDate = new Date("2026-01-12");
			const input = { created: date };

			const result = traverse(input, (value, context) => {
				if (value instanceof Date) {
					context.replace(newDate);
				}
				return TraverseContinue;
			});

			expect((result as typeof input).created).toBe(newDate);
		});

		it("should handle nested structures with primitive-like objects", () => {
			const date = new Date("2026-01-11");
			const regex = /test/gi;
			const error = new Error("error");
			const typedArray = new Uint8Array([1, 2, 3]);

			const input = {
				metadata: {
					timestamp: date,
					pattern: regex,
				},
				errorInfo: {
					lastError: error,
				},
				bufferData: typedArray,
			};

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockReturnValue(TraverseContinue);
			const result = traverse(input, visitor);

			// Should visit: input, metadata, timestamp, pattern, errorInfo, lastError, bufferData
			expect(visitor).toHaveBeenCalledTimes(7);
			expect(result).toEqual(input);
		});

		it("should not traverse into Promise objects", () => {
			const promise = Promise.resolve(42);
			const input = { asyncValue: promise };

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockReturnValue(TraverseContinue);
			const result = traverse(input, visitor);

			// Should visit: input, asyncValue (Promise)
			// But NOT Promise internal properties
			expect(visitor).toHaveBeenCalledTimes(2);
			expect(visitor).toHaveBeenCalledWith(input, expect.any(Object));
			expect(visitor).toHaveBeenCalledWith(promise, expect.any(Object));
			expect((result as typeof input).asyncValue).toBe(promise);
		});

		it("should not traverse into URL objects", () => {
			const url = new URL("https://example.com");
			const input = { link: url };

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockReturnValue(TraverseContinue);
			const result = traverse(input, visitor);

			// Should visit: input, link (URL)
			// But NOT URL internal properties
			expect(visitor).toHaveBeenCalledTimes(2);
			expect(visitor).toHaveBeenCalledWith(input, expect.any(Object));
			expect(visitor).toHaveBeenCalledWith(url, expect.any(Object));
			expect((result as typeof input).link).toBe(url);
		});

		it("should not traverse into URLSearchParams objects", () => {
			const params = new URLSearchParams("foo=bar&baz=qux");
			const input = { params };

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockReturnValue(TraverseContinue);
			const result = traverse(input, visitor);

			// Should visit: input, params (URLSearchParams)
			// But NOT URLSearchParams internal properties
			expect(visitor).toHaveBeenCalledTimes(2);
			expect(visitor).toHaveBeenCalledWith(input, expect.any(Object));
			expect(visitor).toHaveBeenCalledWith(params, expect.any(Object));
			expect((result as typeof input).params).toBe(params);
		});

		it("should not traverse into primitive wrapper objects", () => {
			const input = {
				bool: new Boolean(true),
				num: new Number(42),
				str: new String("test"),
			};

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockReturnValue(TraverseContinue);
			const result = traverse(input, visitor);

			// Should visit: input, bool, num, str
			// But NOT their internal properties
			expect(visitor).toHaveBeenCalledTimes(4);
			expect(result).toEqual(input);
		});

		it("should traverse user-defined class instances", () => {
			class UserClass {
				constructor(
					public value: number,
					public nested: { data: string },
				) {}
			}

			const instance = new UserClass(42, { data: "test" });
			const input = { user: instance };

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockReturnValue(TraverseContinue);
			traverse(input, visitor, { traverseCustomObjects: [UserClass] });

			// Should visit: input, user (UserClass instance), value (number), nested (object), data (string)
			expect(visitor).toHaveBeenCalledTimes(5);
			expect(visitor).toHaveBeenCalledWith(input, expect.any(Object));
			expect(visitor).toHaveBeenCalledWith(instance, expect.any(Object));
			expect(visitor).toHaveBeenCalledWith(42, expect.any(Object));
			expect(visitor).toHaveBeenCalledWith(instance.nested, expect.any(Object));
			expect(visitor).toHaveBeenCalledWith("test", expect.any(Object));
		});

		it("should traverse plain objects created with Object.create(null)", () => {
			const nullProtoObj = Object.create(null);
			nullProtoObj.key = "value";
			nullProtoObj.nested = { data: 123 };
			const input = { custom: nullProtoObj };

			const visitor = vi
				.fn<TraverseVisitor>()
				.mockReturnValue(TraverseContinue);
			const result = traverse(input, visitor);

			// Should visit: input, custom, key, nested, data
			expect(visitor).toHaveBeenCalledTimes(5);
			expect(result).toEqual(input);
		});
	});
});
