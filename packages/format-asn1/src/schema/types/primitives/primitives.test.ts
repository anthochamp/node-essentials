import { describe, expect, it } from "vitest";

import { valueRangeConstraint } from "../../constraints/value-range.js";
import { ref } from "../base.js";
import { ia5String } from "../strings/ia5-string.js";
import { utf8String } from "../strings/utf8-string.js";
import { utcTime } from "../time/utc-time.js";
import { any } from "./any.js";
import { bitString } from "./bit-string.js";
import { boolean } from "./boolean.js";
import { enumerated } from "./enumerated.js";
import { integer } from "./integer.js";
import { nullType } from "./null.js";
import { objectIdentifier } from "./object-identifier.js";
import { octetString } from "./octet-string.js";
import { real } from "./real.js";

describe("boolean()", () => {
	it("has kind 'boolean'", () => {
		expect(ref(boolean()).kind).toBe("boolean");
	});

	it("returns same-kind instance after constraint", () => {
		const s = boolean().constraintUnion(valueRangeConstraint(0n, 1n));
		expect(ref(s).kind).toBe("boolean");
	});
});

describe("integer()", () => {
	it("has kind 'integer'", () => {
		expect(ref(integer()).kind).toBe("integer");
	});

	it(".range() appends a valueRange constraint", () => {
		const s = integer().range(0, 127);
		const constraints = (ref(s) as any).constraints as any[];
		expect(constraints).toHaveLength(1);
		expect(constraints[0]).toMatchObject({
			kind: "valueRange",
			min: 0n,
			max: 127n,
		});
	});

	it(".namedNumbers() stores named number map", () => {
		const s = integer().namedNumbers({ zero: 0n, max: 255n });
		expect((ref(s) as any).namedNumbers).toEqual([
			{ name: "zero", value: 0n },
			{ name: "max", value: 255n },
		]);
	});
});

describe("bitString()", () => {
	it("has kind 'bitString'", () => {
		expect(ref(bitString()).kind).toBe("bitString");
	});

	it(".namedBits() stores named bits", () => {
		const s = bitString().namedBits({ a: 0, b: 1 });
		expect((ref(s) as any).namedBits).toEqual([
			{ name: "a", index: 0 },
			{ name: "b", index: 1 },
		]);
	});
});

describe("octetString()", () => {
	it("has kind 'octetString'", () => {
		expect(ref(octetString()).kind).toBe("octetString");
	});
});

describe("nullType", () => {
	it("has kind 'null'", () => {
		expect(ref(nullType).kind).toBe("null");
	});
});

describe("objectIdentifier()", () => {
	it("has kind 'objectIdentifier'", () => {
		expect(ref(objectIdentifier()).kind).toBe("objectIdentifier");
	});
});

describe("real()", () => {
	it("has kind 'real'", () => {
		expect(ref(real()).kind).toBe("real");
	});
});

describe("enumerated()", () => {
	it("has kind 'enumerated'", () => {
		expect(ref(enumerated()).kind).toBe("enumerated");
	});

	it(".namedNumbers() stores map", () => {
		const s = enumerated().namedNumbers({ a: 0n, b: 1n });
		expect((ref(s) as any).namedNumbers).toEqual([
			{ name: "a", value: 0n },
			{ name: "b", value: 1n },
		]);
	});
});

describe("any()", () => {
	it("has kind 'any'", () => {
		expect(ref(any()).kind).toBe("any");
	});
});

describe("utf8String()", () => {
	it("has kind 'utf8String'", () => {
		expect(ref(utf8String()).kind).toBe("utf8String");
	});

	it(".size() appends size constraint", () => {
		const s = utf8String().size(1, 100);
		const constraints = (ref(s) as any).constraints as any[];
		expect(constraints[0]).toMatchObject({ kind: "size", min: 1n, max: 100n });
	});

	it(".alphabet() appends permittedAlphabet constraint", () => {
		const s = ia5String().alphabet("abc");
		const constraints = (ref(s) as any).constraints as any[];
		expect(constraints[0]).toMatchObject({
			kind: "permittedAlphabet",
			alphabet: "abc",
		});
	});
});

describe("utcTime()", () => {
	it("has kind 'utcTime'", () => {
		expect(ref(utcTime()).kind).toBe("utcTime");
	});
});
