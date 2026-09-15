import { describe, expect, it } from "vitest";

import { AnyAsn1TypeDef } from "./types/any-def.js";
import { contextTag, ref } from "./types/base.js";
import { choice } from "./types/constructed/choice.js";
import { alternative, component } from "./types/constructed/component.js";
import { sequenceOf } from "./types/constructed/sequence-of.js";
import { sequence } from "./types/constructed/sequence.js";
import { boolean } from "./types/primitives/boolean.js";
import { integer } from "./types/primitives/integer.js";
import { lazy } from "./types/primitives/lazy.js";
import { utf8String } from "./types/strings/utf8-string.js";
import { WalkContinue, walkDef, WalkSkipChildren, WalkStop } from "./walk.js";

describe("walkDef — single node", () => {
	it("visits the root node", () => {
		const visited: string[] = [];
		walkDef(ref(integer()), (_def: AnyAsn1TypeDef, path: string) => {
			visited.push(path);
		});
		expect(visited).toEqual([""]);
	});

	it("passes empty string as root path", () => {
		let rootPath: string | undefined;
		walkDef(ref(integer()), (_def: AnyAsn1TypeDef, path: string) => {
			rootPath = path;
		});
		expect(rootPath).toBe("");
	});
});

describe("walkDef — SEQUENCE", () => {
	const s = sequence([
		component("id", integer()),
		component("name", utf8String()),
	] as const);

	it("visits root then children in order", () => {
		const kinds: string[] = [];
		walkDef(ref(s), (def: AnyAsn1TypeDef) => {
			kinds.push(def.kind);
		});
		expect(kinds).toEqual(["sequence", "integer", "utf8String"]);
	});

	it("builds correct paths for children", () => {
		const paths: string[] = [];
		walkDef(ref(s), (_def: AnyAsn1TypeDef, path: string) => {
			paths.push(path);
		});
		expect(paths).toContain("components[0]:id");
		expect(paths).toContain("components[1]:name");
	});
});

describe("walkDef — SEQUENCE OF", () => {
	it("descends into elementType", () => {
		const s = sequenceOf(integer());
		const kinds: string[] = [];
		walkDef(ref(s), (def: AnyAsn1TypeDef) => {
			kinds.push(def.kind);
		});
		expect(kinds).toEqual(["sequenceOf", "integer"]);
	});

	it("uses 'elementType' as child path", () => {
		const paths: string[] = [];
		walkDef(
			ref(sequenceOf(boolean())),
			(_def: AnyAsn1TypeDef, path: string) => {
				paths.push(path);
			},
		);
		expect(paths).toContain("elementType");
	});
});

describe("walkDef — CHOICE", () => {
	it("visits alternatives", () => {
		const s = choice([
			alternative("a", integer()),
			alternative("b", utf8String()),
		] as const);
		const kinds: string[] = [];
		walkDef(ref(s), (def: AnyAsn1TypeDef) => {
			kinds.push(def.kind);
		});
		expect(kinds).toEqual(["choice", "integer", "utf8String"]);
	});
});

describe("walkDef — tagged", () => {
	it("descends into innerType", () => {
		const s = contextTag(0, integer());
		const kinds: string[] = [];
		walkDef(ref(s), (def: AnyAsn1TypeDef) => {
			kinds.push(def.kind);
		});
		expect(kinds).toEqual(["tagged", "integer"]);
	});
});

describe("walkDef — lazy", () => {
	it("resolves and descends into lazy schema", () => {
		const s = lazy(() => integer());
		const kinds: string[] = [];
		walkDef(ref(s), (def: AnyAsn1TypeDef) => {
			kinds.push(def.kind);
		});
		expect(kinds).toEqual(["lazy", "integer"]);
	});
});

describe("walkDef — control tokens", () => {
	it("WalkSkipChildren skips descendants", () => {
		const s = sequence([component("id", integer())] as const);
		const kinds: string[] = [];
		walkDef(ref(s), (def: AnyAsn1TypeDef) => {
			kinds.push(def.kind);
			return WalkSkipChildren;
		});
		expect(kinds).toEqual(["sequence"]);
	});

	it("WalkStop aborts the entire walk", () => {
		const s = sequence([
			component("a", integer()),
			component("b", utf8String()),
		] as const);
		const kinds: string[] = [];
		walkDef(ref(s), (def: AnyAsn1TypeDef) => {
			kinds.push(def.kind);
			if (def.kind === "integer") return WalkStop;
		});
		expect(kinds).toEqual(["sequence", "integer"]);
	});

	it("walkDef returns true when stopped", () => {
		const stopped = walkDef(ref(integer()), () => WalkStop);
		expect(stopped).toBe(true);
	});

	it("walkDef returns false when not stopped", () => {
		const stopped = walkDef(ref(integer()), () => WalkContinue);
		expect(stopped).toBe(false);
	});
});
