import { describe, expect, it } from "vitest";

import { OidError } from "./errors.js";
import { OidRegistry, wellKnownOidRegistry } from "./registry.js";

describe("OidRegistry", () => {
	describe("register / lookup", () => {
		it("registers an OID and looks it up by components", () => {
			const registry = new OidRegistry();
			registry.register("1.2.3.4", "myOid", "A test OID");
			const entry = registry.lookup([1, 2, 3, 4]);
			expect(entry).toBeDefined();
			expect(entry?.name).toBe("myOid");
			expect(entry?.description).toBe("A test OID");
			expect(entry?.dotted).toBe("1.2.3.4");
			expect(entry?.components).toEqual([1, 2, 3, 4]);
		});

		it("registers an OID and looks it up by dotted string", () => {
			const registry = new OidRegistry();
			registry.register("1.2.3.4", "myOid");
			expect(registry.lookupByDotted("1.2.3.4")).toBeDefined();
		});

		it("returns undefined for an unregistered OID", () => {
			const registry = new OidRegistry();
			expect(registry.lookup([9, 9, 9])).toBeUndefined();
			expect(registry.lookupByDotted("9.9.9")).toBeUndefined();
		});

		it("overwrites a previously registered entry", () => {
			const registry = new OidRegistry();
			registry.register("1.2.3", "first");
			registry.register("1.2.3", "second");
			expect(registry.lookup([1, 2, 3])?.name).toBe("second");
		});

		it("throws OidError when dotted string is invalid", () => {
			const registry = new OidRegistry();
			expect(() => registry.register("3.0", "bad")).toThrow(OidError);
		});
	});

	describe("lookupByName", () => {
		it("finds an entry by exact name", () => {
			const registry = new OidRegistry();
			registry.register("1.2.3.4", "myOid");
			const entry = registry.lookupByName("myOid");
			expect(entry?.dotted).toBe("1.2.3.4");
		});

		it("returns undefined when no entry has that name", () => {
			const registry = new OidRegistry();
			expect(registry.lookupByName("missing")).toBeUndefined();
		});
	});

	describe("formatName", () => {
		it("returns the registered name for a known OID", () => {
			const registry = new OidRegistry();
			registry.register("1.2.3.4", "myOid");
			expect(registry.formatName([1, 2, 3, 4])).toBe("myOid");
		});

		it("returns dotted decimal for an unregistered OID", () => {
			const registry = new OidRegistry();
			expect(registry.formatName([1, 2, 999])).toBe("1.2.999");
		});
	});

	describe("entries", () => {
		it("iterates all registered entries", () => {
			const registry = new OidRegistry();
			registry.register("1.2.3", "a");
			registry.register("1.2.4", "b");
			const names = [...registry.entries()].map((e) => e.name);
			expect(names).toContain("a");
			expect(names).toContain("b");
			expect(names).toHaveLength(2);
		});
	});
});

describe("wellKnownOidRegistry", () => {
	it("has sha256 registered", () => {
		const entry = wellKnownOidRegistry.lookup([2, 16, 840, 1, 101, 3, 4, 2, 1]);
		expect(entry?.name).toBe("sha256");
	});

	it("has rsaEncryption registered", () => {
		expect(
			wellKnownOidRegistry.lookup([1, 2, 840, 113549, 1, 1, 1])?.name,
		).toBe("rsaEncryption");
	});

	it("has commonName registered", () => {
		expect(wellKnownOidRegistry.lookup([2, 5, 4, 3])?.name).toBe("commonName");
	});

	it("has prime256v1 registered", () => {
		expect(wellKnownOidRegistry.lookup([1, 2, 840, 10045, 3, 1, 7])?.name).toBe(
			"prime256v1",
		);
	});

	it("returns dotted decimal for an unrecognised OID", () => {
		expect(wellKnownOidRegistry.formatName([1, 2, 99999])).toBe("1.2.99999");
	});

	it("can be searched by name", () => {
		expect(wellKnownOidRegistry.lookupByName("sha256")?.dotted).toBe(
			"2.16.840.1.101.3.4.2.1",
		);
	});
});
