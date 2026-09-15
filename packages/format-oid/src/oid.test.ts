import { describe, expect, it } from "vitest";

import { OidError } from "./errors.js";
import {
	oidAppend,
	oidEqual,
	oidFromDotted,
	oidRelative,
	oidStartsWith,
	oidToDotted,
	relativeOidFromDotted,
	relativeOidToDotted,
	validateOid,
	validateRelativeOid,
	wellKnownRootArcs,
} from "./oid.js";

describe("wellKnownRootArcs", () => {
	it("has the correct arc values per X.660 §C.2", () => {
		expect(wellKnownRootArcs.ituT).toBe(0);
		expect(wellKnownRootArcs.iso).toBe(1);
		expect(wellKnownRootArcs.jointIsoItuT).toBe(2);
	});
});

describe("validateOid", () => {
	it("accepts a minimal valid OID (2 arcs)", () => {
		expect(() => validateOid([0, 0])).not.toThrow();
	});

	it("accepts all valid first arcs (0, 1, 2)", () => {
		expect(() => validateOid([0, 0])).not.toThrow();
		expect(() => validateOid([1, 0])).not.toThrow();
		expect(() => validateOid([2, 0])).not.toThrow();
	});

	it("accepts second arc = 39 for first arc 0 and 1", () => {
		expect(() => validateOid([0, 39])).not.toThrow();
		expect(() => validateOid([1, 39])).not.toThrow();
	});

	it("accepts second arc > 39 for first arc 2 (joint-iso-itu-t, no upper bound)", () => {
		expect(() => validateOid([2, 999])).not.toThrow();
		expect(() => validateOid([2, 40])).not.toThrow();
		expect(() => validateOid([2, 16840])).not.toThrow();
	});

	it("accepts a realistic multi-arc OID", () => {
		// SHA-256: 2.16.840.1.101.3.4.2.1
		expect(() => validateOid([2, 16, 840, 1, 101, 3, 4, 2, 1])).not.toThrow();
	});

	it("throws for fewer than 2 arcs", () => {
		expect(() => validateOid([])).toThrow(OidError);
		expect(() => validateOid([1])).toThrow(OidError);
	});

	it("throws for first arc > 2", () => {
		expect(() => validateOid([3, 0])).toThrow(OidError);
	});

	it("throws for second arc > 39 when first arc is 0", () => {
		expect(() => validateOid([0, 40])).toThrow(OidError);
	});

	it("throws for second arc > 39 when first arc is 1", () => {
		expect(() => validateOid([1, 40])).toThrow(OidError);
	});

	it("throws for negative arc", () => {
		expect(() => validateOid([1, -1])).toThrow(OidError);
		expect(() => validateOid([1, 0, -1])).toThrow(OidError);
	});

	it("throws for non-integer arc", () => {
		expect(() => validateOid([1, 0, 1.5])).toThrow(OidError);
	});
});

describe("validateRelativeOid", () => {
	it("accepts an empty relative OID", () => {
		expect(() => validateRelativeOid([])).not.toThrow();
	});

	it("accepts valid components", () => {
		expect(() => validateRelativeOid([0, 1, 2, 840])).not.toThrow();
	});

	it("throws for negative component", () => {
		expect(() => validateRelativeOid([1, -1])).toThrow(OidError);
	});

	it("throws for non-integer component", () => {
		expect(() => validateRelativeOid([1, 2.5])).toThrow(OidError);
	});
});

describe("oidEqual", () => {
	it("returns true for identical OIDs", () => {
		expect(oidEqual([1, 2, 840, 113549], [1, 2, 840, 113549])).toBe(true);
	});

	it("returns false for different OIDs with same length", () => {
		expect(oidEqual([1, 2, 3], [1, 2, 4])).toBe(false);
	});

	it("returns false for different lengths", () => {
		expect(oidEqual([1, 2, 3], [1, 2])).toBe(false);
	});

	it("returns true for minimal OIDs", () => {
		expect(oidEqual([0, 0], [0, 0])).toBe(true);
	});
});

describe("oidStartsWith", () => {
	it("returns true when prefix is a proper prefix", () => {
		expect(oidStartsWith([1, 2, 840, 113549], [1, 2, 840])).toBe(true);
	});

	it("returns true when OID equals prefix", () => {
		expect(oidStartsWith([1, 2, 3], [1, 2, 3])).toBe(true);
	});

	it("returns false when prefix is longer than OID", () => {
		expect(oidStartsWith([1, 2], [1, 2, 3])).toBe(false);
	});

	it("returns false when prefix does not match", () => {
		expect(oidStartsWith([1, 2, 3], [1, 2, 4])).toBe(false);
	});

	it("returns true for empty prefix", () => {
		expect(oidStartsWith([1, 2, 3], [])).toBe(true);
	});
});

describe("oidRelative", () => {
	it("returns the suffix arcs after the base", () => {
		expect(oidRelative([1, 2, 840, 113549], [1, 2])).toEqual([840, 113549]);
	});

	it("returns an empty array when OID equals base", () => {
		expect(oidRelative([1, 2, 3], [1, 2, 3])).toEqual([]);
	});

	it("throws when OID does not start with base", () => {
		expect(() => oidRelative([1, 2, 3], [1, 2, 4])).toThrow(OidError);
	});
});

describe("oidAppend", () => {
	it("appends relative components to a base OID", () => {
		expect(oidAppend([1, 2], [840, 113549])).toEqual([1, 2, 840, 113549]);
	});

	it("appends an empty relative OID (no-op)", () => {
		expect(oidAppend([1, 2, 3], [])).toEqual([1, 2, 3]);
	});
});

describe("oidToDotted", () => {
	it("formats a standard OID as dotted decimal", () => {
		expect(oidToDotted([1, 2, 840, 113549])).toBe("1.2.840.113549");
	});

	it("formats a minimal two-arc OID", () => {
		expect(oidToDotted([0, 0])).toBe("0.0");
	});
});

describe("oidFromDotted", () => {
	it("parses a valid dotted OID string", () => {
		expect(oidFromDotted("1.2.840.113549")).toEqual([1, 2, 840, 113549]);
	});

	it("round-trips through oidToDotted", () => {
		const oid = [2, 16, 840, 1, 101, 3, 4, 2, 1];
		expect(oidFromDotted(oidToDotted(oid))).toEqual(oid);
	});

	it("throws for an empty string", () => {
		expect(() => oidFromDotted("")).toThrow(OidError);
	});

	it("throws for a string with non-numeric components", () => {
		expect(() => oidFromDotted("1.2.abc")).toThrow(OidError);
	});

	it("throws for a single-arc string (structural violation)", () => {
		expect(() => oidFromDotted("1")).toThrow(OidError);
	});

	it("throws for a structurally invalid OID (first arc > 2)", () => {
		expect(() => oidFromDotted("3.0.1")).toThrow(OidError);
	});

	it("throws for second arc > 39 when first arc is 0", () => {
		expect(() => oidFromDotted("0.40.1")).toThrow(OidError);
	});
});

describe("relativeOidToDotted", () => {
	it("formats components as dotted decimal", () => {
		expect(relativeOidToDotted([3, 4, 5])).toBe("3.4.5");
	});

	it("returns an empty string for an empty relative OID", () => {
		expect(relativeOidToDotted([])).toBe("");
	});
});

describe("relativeOidFromDotted", () => {
	it("parses a valid dotted string", () => {
		expect(relativeOidFromDotted("3.4.5")).toEqual([3, 4, 5]);
	});

	it("returns an empty array for an empty string", () => {
		expect(relativeOidFromDotted("")).toEqual([]);
	});

	it("round-trips through relativeOidToDotted", () => {
		const relOid = [840, 113549, 1, 1, 11];
		expect(relativeOidFromDotted(relativeOidToDotted(relOid))).toEqual(relOid);
	});

	it("throws for non-numeric components", () => {
		expect(() => relativeOidFromDotted("1.2.x")).toThrow(OidError);
	});
});
