import { describe, expect, it } from "vitest";

import { ref } from "../base.js";
import { boolean } from "../primitives/boolean.js";
import { integer } from "../primitives/integer.js";
import { utf8String } from "../strings/utf8-string.js";
import { choice } from "./choice.js";
import {
	alternative,
	component,
	extensionAdditionGroup,
	extensionMarker,
} from "./component.js";
import { sequenceOf } from "./sequence-of.js";
import { sequence } from "./sequence.js";
import { setOf } from "./set-of.js";
import { set } from "./set.js";

describe("sequence()", () => {
	it("has kind 'sequence'", () => {
		expect(ref(sequence([])).kind).toBe("sequence");
	});

	it("stores component defs", () => {
		const s = sequence([
			component("id", integer()),
			component("name", utf8String()),
		] as const);
		expect(ref(s).components).toHaveLength(2);
		expect((ref(s).components[0] as any).name).toBe("id");
		expect((ref(s).components[1] as any).name).toBe("name");
	});

	it("marks optional members", () => {
		const s = sequence([component("x", boolean()).optional()] as const);
		expect((ref(s).components[0] as any).optional).toBe(true);
	});

	it("stores extension marker", () => {
		const s = sequence([component("a", integer()), extensionMarker] as const);
		expect((ref(s).components[1] as any).kind).toBe("extensionMarker");
	});

	it("stores extension addition group", () => {
		const group = extensionAdditionGroup(2, [component("b", utf8String())]);
		const s = sequence([
			component("a", integer()),
			extensionMarker,
			group,
		] as const);
		expect((ref(s).components[2] as any).kind).toBe("extensionAdditionGroup");
	});
});

describe("sequenceOf()", () => {
	it("has kind 'sequenceOf'", () => {
		expect(ref(sequenceOf(integer())).kind).toBe("sequenceOf");
	});

	it("stores element type def", () => {
		const s = sequenceOf(integer());
		expect((ref(s) as any).elementType.kind).toBe("integer");
	});

	it(".size() appends size constraint", () => {
		const s = sequenceOf(integer()).size(1, 10);
		const constraints = (ref(s) as any).constraints as any[];
		expect(constraints[0]).toMatchObject({ kind: "size", min: 1n, max: 10n });
	});
});

describe("set()", () => {
	it("has kind 'set'", () => {
		expect(ref(set([])).kind).toBe("set");
	});

	it("stores component defs", () => {
		const s = set([component("a", integer())] as const);
		expect(ref(s).components).toHaveLength(1);
	});
});

describe("setOf()", () => {
	it("has kind 'setOf'", () => {
		expect(ref(setOf(boolean())).kind).toBe("setOf");
	});
});

describe("choice()", () => {
	it("has kind 'choice'", () => {
		expect(ref(choice([])).kind).toBe("choice");
	});

	it("stores alternative defs", () => {
		const s = choice([
			alternative("a", integer()),
			alternative("b", utf8String()),
		] as const);
		expect(ref(s).alternatives).toHaveLength(2);
		expect((ref(s).alternatives[0] as any).name).toBe("a");
	});

	it("stores extension markers", () => {
		const s = choice([alternative("a", boolean()), extensionMarker] as const);
		expect((ref(s).alternatives[1] as any).kind).toBe("extensionMarker");
	});
});
