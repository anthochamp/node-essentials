import { describe, expect, it } from "vitest";

import {
	applicationTag,
	contextImplicitTag,
	contextTag,
	privateTag,
	ref,
} from "./base.js";
import { integer } from "./primitives/integer.js";
import { utf8String } from "./strings/utf8-string.js";

describe("contextTag()", () => {
	it("has kind 'tagged'", () => {
		const s = contextTag(0, integer());
		expect(ref(s).kind).toBe("tagged");
	});

	it("stores tag class 'context' and number", () => {
		const s = contextTag(3, integer());
		expect((ref(s) as any).tag).toMatchObject({
			tagClass: "context",
			tagNumber: 3,
		});
	});

	it("defaults to explicit mode", () => {
		const s = contextTag(0, integer());
		expect((ref(s) as any).mode).toBe("explicit");
	});

	it("wraps the inner type def", () => {
		const s = contextTag(0, integer());
		expect((ref(s) as any).innerType.kind).toBe("integer");
	});
});

describe("contextImplicitTag()", () => {
	it("uses implicit mode", () => {
		const s = contextImplicitTag(1, utf8String());
		expect((ref(s) as any).mode).toBe("implicit");
	});
});

describe("applicationTag()", () => {
	it("uses application tag class", () => {
		const s = applicationTag(5, "implicit", integer());
		expect((ref(s) as any).tag).toMatchObject({
			tagClass: "application",
			tagNumber: 5,
		});
	});

	it("accepts explicit mode override", () => {
		const s = applicationTag(5, "explicit", integer());
		expect((ref(s) as any).mode).toBe("explicit");
	});
});

describe("privateTag()", () => {
	it("uses private tag class", () => {
		const s = privateTag(1, "implicit", integer());
		expect((ref(s) as any).tag).toMatchObject({
			tagClass: "private",
			tagNumber: 1,
		});
	});
});

describe("Asn1Type instance tagging methods", () => {
	it(".contextTag() wraps self", () => {
		const s = integer().contextTag(0);
		expect(ref(s).kind).toBe("tagged");
		expect((ref(s) as any).innerType.kind).toBe("integer");
	});

	it(".contextImplicitTag() uses implicit mode", () => {
		const s = utf8String().contextImplicitTag(2);
		expect((ref(s) as any).mode).toBe("implicit");
	});

	it(".tag() with application class", () => {
		const s = integer().tag("application", 1, "explicit");
		expect((ref(s) as any).tag).toMatchObject({
			tagClass: "application",
			tagNumber: 1,
		});
	});
});
