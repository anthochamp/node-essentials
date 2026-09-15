import { describe, expectTypeOf, it } from "vitest";

import {
	Asn1TaggedType,
	contextImplicitTag,
	contextTag,
	InputOf,
	ValueOf,
} from "./base.js";
import type { Asn1IntegerTypeDef } from "./primitives/integer.js";
import { integer } from "./primitives/integer.js";
import { utf8String } from "./strings/utf8-string.js";

describe("Asn1TaggedType — type preservation", () => {
	it("contextTag preserves ValueOf", () => {
		const schema = contextTag(0, integer());
		expectTypeOf<ValueOf<typeof schema>>().toEqualTypeOf<bigint>();
	});

	it("contextImplicitTag preserves ValueOf", () => {
		const schema = contextImplicitTag(1, utf8String());
		expectTypeOf<ValueOf<typeof schema>>().toEqualTypeOf<string>();
	});

	it("instance method .contextTag() preserves ValueOf", () => {
		const schema = integer().contextTag(3);
		expectTypeOf<ValueOf<typeof schema>>().toEqualTypeOf<bigint>();
	});

	it("instance method .contextImplicitTag() preserves ValueOf", () => {
		const schema = utf8String().contextImplicitTag(2);
		expectTypeOf<ValueOf<typeof schema>>().toEqualTypeOf<string>();
	});

	it("ValueOf<Asn1TaggedType<D>> = ValueOf<D>", () => {
		type Schema = Asn1TaggedType<Asn1IntegerTypeDef>;
		expectTypeOf<ValueOf<Schema>>().toEqualTypeOf<bigint>();
	});

	it("InputOf<Asn1TaggedType<D>> = InputOf<D>", () => {
		type Schema = Asn1TaggedType<Asn1IntegerTypeDef>;
		expectTypeOf<InputOf<Schema>>().toEqualTypeOf<bigint>();
	});
});
