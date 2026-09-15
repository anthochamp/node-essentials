import { describe, expect, it } from "vitest";

import { module } from "./module.js";
import { ref } from "./types/base.js";
import { choice } from "./types/constructed/choice.js";
import { alternative, component } from "./types/constructed/component.js";
import { sequence } from "./types/constructed/sequence.js";
import { integer } from "./types/primitives/integer.js";
import { utf8String } from "./types/strings/utf8-string.js";

describe("module()", () => {
	it("creates a module with the given name", () => {
		const mod = module({ name: "TestModule" }, {});
		expect(mod.def.name).toBe("TestModule");
	});

	it("stores raw types in processedTypes when no tagging", () => {
		const myInt = integer();
		const types = { MyInt: myInt };
		const mod = module({ name: "M" }, types);
		expect(mod.processedTypes["MyInt"]).toBe(ref(myInt));
	});

	it("applies automatic tagging to SEQUENCE components", () => {
		const s = sequence([
			component("a", integer()),
			component("b", utf8String()),
		] as const);
		const mod = module({ name: "M", tagging: "automatic" }, { S: s });
		const processed = mod.processedTypes["S"] as any;
		expect(processed.components[0].type.kind).toBe("tagged");
		expect(processed.components[0].type.tag.tagNumber).toBe(0);
		expect(processed.components[1].type.kind).toBe("tagged");
		expect(processed.components[1].type.tag.tagNumber).toBe(1);
	});

	it("applies automatic tagging to CHOICE alternatives", () => {
		const c = choice([
			alternative("x", integer()),
			alternative("y", utf8String()),
		] as const);
		const mod = module({ name: "M", tagging: "automatic" }, { C: c });
		const processed = mod.processedTypes["C"] as any;
		expect(processed.alternatives[0].type.kind).toBe("tagged");
		expect(processed.alternatives[0].type.tag.tagNumber).toBe(0);
	});

	it("does not re-tag already-tagged components", () => {
		const s = sequence([
			component("a", integer().contextImplicitTag(9)),
		] as const);
		const mod = module({ name: "M", tagging: "automatic" }, { S: s });
		const processed = mod.processedTypes["S"] as any;
		// The component was already tagged — counter should have advanced but the
		// outer tag number should remain 9 (not overwritten).
		expect(processed.components[0].type.tag.tagNumber).toBe(9);
	});

	it("stores oid when provided", () => {
		const mod = module({ name: "M", oid: [1, 2, 840] }, {});
		expect(mod.def.oid).toEqual([1, 2, 840]);
	});

	it("defaults exports to 'all'", () => {
		const mod = module({ name: "M" }, {});
		expect(mod.def.exports).toBe("all");
	});
});
