import { describe, expectTypeOf, it } from "vitest";

import { ValueOf } from "../base.js";
import { boolean } from "../primitives/boolean.js";
import { integer } from "../primitives/integer.js";
import { utf8String } from "../strings/utf8-string.js";
import { choice } from "./choice.js";
import { alternative, component, extensionMarker } from "./component.js";
import { sequenceOf } from "./sequence-of.js";
import { sequence } from "./sequence.js";
import { setOf } from "./set-of.js";
import { set } from "./set.js";

describe("ValueOf — SEQUENCE", () => {
	const schema = sequence([
		component("id", integer()),
		component("name", utf8String()).optional(),
	] as const);

	it("maps required fields to their types", () => {
		type Out = ValueOf<typeof schema>;
		expectTypeOf<Out>().toMatchTypeOf<{ readonly id: bigint }>();
	});

	it("maps optional fields to optional properties", () => {
		type Out = ValueOf<typeof schema>;
		expectTypeOf<Out>().toMatchTypeOf<{ readonly name?: string }>();
	});
});

describe("ValueOf — SEQUENCE OF", () => {
	it("wraps element type in an array", () => {
		const schema = sequenceOf(integer());
		expectTypeOf<ValueOf<typeof schema>>().toEqualTypeOf<
			ReadonlyArray<bigint>
		>();
	});
});

describe("ValueOf — SET", () => {
	it("maps members the same as SEQUENCE", () => {
		const schema = set([component("flag", boolean())] as const);
		type Out = ValueOf<typeof schema>;
		expectTypeOf<Out>().toMatchTypeOf<{ readonly flag: boolean }>();
	});
});

describe("ValueOf — SET OF", () => {
	it("wraps element type in an array", () => {
		const schema = setOf(utf8String());
		expectTypeOf<ValueOf<typeof schema>>().toEqualTypeOf<
			ReadonlyArray<string>
		>();
	});
});

describe("ValueOf — CHOICE", () => {
	const schema = choice([
		alternative("id", integer()),
		alternative("name", utf8String()),
	] as const);

	it("produces a tagged-union type", () => {
		type Out = ValueOf<typeof schema>;
		expectTypeOf<Out>().toMatchTypeOf<
			| { readonly kind: "id"; readonly value: bigint }
			| { readonly kind: "name"; readonly value: string }
		>();
	});

	it("does not include extension markers in the union", () => {
		const ext = choice([alternative("a", boolean()), extensionMarker] as const);
		type Out = ValueOf<typeof ext>;
		// extension marker contributes `never` → only the alternative remains
		expectTypeOf<Out>().toMatchTypeOf<{
			readonly kind: "a";
			readonly value: boolean;
		}>();
	});
});
