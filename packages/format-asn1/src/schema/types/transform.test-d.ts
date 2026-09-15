import { describe, expectTypeOf, it } from "vitest";

import { Asn1TransformType, InputOf, ValueOf } from "./base.js";
import { integer } from "./primitives/integer.js";
import { utf8String } from "./strings/utf8-string.js";

describe("Asn1TransformType — type change", () => {
	it("ValueOf reflects the output of the transform fn", () => {
		const schema = integer().transform((v) => Number(v));
		expectTypeOf<ValueOf<typeof schema>>().toEqualTypeOf<number>();
	});

	it("InputOf preserves original input type", () => {
		const schema = integer().transform((v) => String(v));
		expectTypeOf<InputOf<typeof schema>>().toEqualTypeOf<bigint>();
	});

	it("ValueOf<Asn1TransformType<number, bigint>> = number", () => {
		expectTypeOf<
			ValueOf<Asn1TransformType<number, bigint>>
		>().toEqualTypeOf<number>();
	});

	it("InputOf<Asn1TransformType<number, bigint>> = bigint", () => {
		expectTypeOf<
			InputOf<Asn1TransformType<number, bigint>>
		>().toEqualTypeOf<bigint>();
	});

	it("chained transform changes ValueOf twice", () => {
		const schema = integer()
			.transform((v) => Number(v))
			.transform((v) => String(v));
		expectTypeOf<ValueOf<typeof schema>>().toEqualTypeOf<string>();
	});

	it("string transform produces a string schema", () => {
		const schema = utf8String().transform((v) => v.split(","));
		expectTypeOf<ValueOf<typeof schema>>().toEqualTypeOf<string[]>();
	});
});
