import type { ObjectIdentifier } from "@ac-kit/format-oid";
import { describe, expectTypeOf, it } from "vitest";

import {
	AnyValue,
	BitStringValue,
	GeneralizedTimeValue,
	RealValue,
	UtcTimeValue,
} from "../../values.js";
import { InputOf, ValueOf } from "../base.js";
import { ia5String } from "../strings/ia5-string.js";
import { numericString } from "../strings/numeric-string.js";
import { printableString } from "../strings/printable-string.js";
import { utf8String } from "../strings/utf8-string.js";
import { visibleString } from "../strings/visible-string.js";
import { generalizedTime } from "../time/generalized-time.js";
import { utcTime } from "../time/utc-time.js";
import { any } from "./any.js";
import { bitString } from "./bit-string.js";
import { boolean } from "./boolean.js";
import { enumerated } from "./enumerated.js";
import { integer } from "./integer.js";
import { lazy } from "./lazy.js";
import { nullType } from "./null.js";
import { objectIdentifier } from "./object-identifier.js";
import { octetString } from "./octet-string.js";
import { oidIri } from "./oid-iri.js";
import { real } from "./real.js";
import { relativeOidIri } from "./relative-oid-iri.js";
import { relativeOid } from "./relative-oid.js";

describe("ValueOf — primitive types", () => {
	it("boolean → boolean", () => {
		expectTypeOf<
			ValueOf<ReturnType<typeof boolean>>
		>().toEqualTypeOf<boolean>();
	});

	it("integer → bigint", () => {
		expectTypeOf<ValueOf<ReturnType<typeof integer>>>().toEqualTypeOf<bigint>();
	});

	it("bitString → BitStringValue", () => {
		expectTypeOf<
			ValueOf<ReturnType<typeof bitString>>
		>().toEqualTypeOf<BitStringValue>();
	});

	it("octetString → Uint8Array", () => {
		expectTypeOf<
			ValueOf<ReturnType<typeof octetString>>
		>().toEqualTypeOf<Uint8Array>();
	});

	it("nullType → null", () => {
		expectTypeOf<ValueOf<typeof nullType>>().toEqualTypeOf<null>();
	});

	it("objectIdentifier → ObjectIdentifier", () => {
		expectTypeOf<
			ValueOf<ReturnType<typeof objectIdentifier>>
		>().toEqualTypeOf<ObjectIdentifier>();
	});

	it("relativeOid → ObjectIdentifier", () => {
		expectTypeOf<
			ValueOf<ReturnType<typeof relativeOid>>
		>().toEqualTypeOf<ObjectIdentifier>();
	});

	it("oidIri → string", () => {
		expectTypeOf<ValueOf<ReturnType<typeof oidIri>>>().toEqualTypeOf<string>();
	});

	it("relativeOidIri → string", () => {
		expectTypeOf<
			ValueOf<ReturnType<typeof relativeOidIri>>
		>().toEqualTypeOf<string>();
	});

	it("real → RealValue", () => {
		expectTypeOf<ValueOf<ReturnType<typeof real>>>().toEqualTypeOf<RealValue>();
	});

	it("enumerated → bigint", () => {
		expectTypeOf<
			ValueOf<ReturnType<typeof enumerated>>
		>().toEqualTypeOf<bigint>();
	});

	it("any → AnyValue", () => {
		expectTypeOf<ValueOf<ReturnType<typeof any>>>().toEqualTypeOf<AnyValue>();
	});

	it("lazy → preserves inner type", () => {
		const s = lazy(() => boolean());
		expectTypeOf<ValueOf<typeof s>>().toEqualTypeOf<boolean>();
	});

	it("utf8String → string", () => {
		expectTypeOf<
			ValueOf<ReturnType<typeof utf8String>>
		>().toEqualTypeOf<string>();
	});

	it("numericString → string", () => {
		expectTypeOf<
			ValueOf<ReturnType<typeof numericString>>
		>().toEqualTypeOf<string>();
	});

	it("printableString → string", () => {
		expectTypeOf<
			ValueOf<ReturnType<typeof printableString>>
		>().toEqualTypeOf<string>();
	});

	it("ia5String → string", () => {
		expectTypeOf<
			ValueOf<ReturnType<typeof ia5String>>
		>().toEqualTypeOf<string>();
	});

	it("visibleString → string", () => {
		expectTypeOf<
			ValueOf<ReturnType<typeof visibleString>>
		>().toEqualTypeOf<string>();
	});

	it("utcTime → UtcTimeValue", () => {
		expectTypeOf<
			ValueOf<ReturnType<typeof utcTime>>
		>().toEqualTypeOf<UtcTimeValue>();
	});

	it("generalizedTime → GeneralizedTimeValue", () => {
		expectTypeOf<
			ValueOf<ReturnType<typeof generalizedTime>>
		>().toEqualTypeOf<GeneralizedTimeValue>();
	});
});

describe("InputOf — default equals Output", () => {
	it("boolean input = boolean", () => {
		expectTypeOf<
			InputOf<ReturnType<typeof boolean>>
		>().toEqualTypeOf<boolean>();
	});

	it("integer input = bigint", () => {
		expectTypeOf<InputOf<ReturnType<typeof integer>>>().toEqualTypeOf<bigint>();
	});
});
