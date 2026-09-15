import { describe, expect, it } from "vitest";

import {
	SIMPLE_SEQUENCE_MODULE,
	X501_NAME_MODULE,
} from "./__fixtures__/modules.js";
import { parseModule, printCst, printCstSpan, walkCst } from "./index.js";

describe("printCst — lossless round-trip", () => {
	it("reproduces the original source exactly (up to trailing whitespace)", () => {
		const { cst, errors } = parseModule(SIMPLE_SEQUENCE_MODULE);
		expect(errors).toHaveLength(0);
		expect(printCst(cst, SIMPLE_SEQUENCE_MODULE)).toBe(
			SIMPLE_SEQUENCE_MODULE.trimEnd(),
		);
	});

	it("round-trips X.501 module", () => {
		const { cst, errors } = parseModule(X501_NAME_MODULE);
		expect(errors).toHaveLength(0);
		expect(printCst(cst, X501_NAME_MODULE)).toBe(X501_NAME_MODULE.trimEnd());
	});
});

describe("printCstSpan — subtree extraction", () => {
	it("extracts a single assignment's source text", () => {
		const { cst } = parseModule(SIMPLE_SEQUENCE_MODULE);
		const validityAssignment = cst.body.assignments.find(
			(a) => a.name.text === "Validity",
		);
		expect(validityAssignment).toBeDefined();
		const text = printCstSpan(validityAssignment!.span, SIMPLE_SEQUENCE_MODULE);
		expect(text).toContain("Validity");
		expect(text).toContain("SEQUENCE");
		expect(text).toContain("notBefore");
		// Must not include adjacent assignments
		expect(text).not.toContain("Time ::=");
	});

	it("extracts a type node's span", () => {
		const { cst } = parseModule(SIMPLE_SEQUENCE_MODULE);
		const timeAssignment = cst.body.assignments.find(
			(a) => a.name.text === "Time",
		);
		const typeText = printCstSpan(
			timeAssignment!.type.span,
			SIMPLE_SEQUENCE_MODULE,
		);
		expect(typeText).toContain("CHOICE");
		expect(typeText).toContain("utcTime");
	});
});

describe("walkCst — visitor callbacks", () => {
	it("calls onModule with the root node", () => {
		const { cst } = parseModule(SIMPLE_SEQUENCE_MODULE);
		let called = false;
		walkCst(cst, {
			onModule: () => {
				called = true;
			},
		});
		expect(called).toBe(true);
	});

	it("calls onTypeAssignment for each assignment", () => {
		const { cst } = parseModule(SIMPLE_SEQUENCE_MODULE);
		const names: string[] = [];
		walkCst(cst, {
			onTypeAssignment: (a) => {
				names.push(a.name.text);
			},
		});
		expect(names).toContain("Version");
		expect(names).toContain("Validity");
		expect(names).toContain("Time");
	});

	it("calls onType for nested type nodes", () => {
		const { cst } = parseModule(SIMPLE_SEQUENCE_MODULE);
		const kinds = new Set<string>();
		walkCst(cst, {
			onType: (t) => {
				kinds.add(t.kind);
			},
		});
		expect(kinds.has("sequence")).toBe(true);
		expect(kinds.has("choice")).toBe(true);
	});

	it("skipChildren on onModule skips all assignments", () => {
		const { cst } = parseModule(SIMPLE_SEQUENCE_MODULE);
		const names: string[] = [];
		walkCst(cst, {
			onModule: () => "skipChildren",
			onTypeAssignment: (a) => {
				names.push(a.name.text);
			},
		});
		expect(names).toHaveLength(0);
	});

	it("skipChildren on assignment skips its type tree", () => {
		const { cst } = parseModule(SIMPLE_SEQUENCE_MODULE);
		const types: string[] = [];
		walkCst(cst, {
			onTypeAssignment: (a) => {
				if (a.name.text === "Validity") return "skipChildren";
			},
			onType: (t) => {
				types.push(t.kind);
			},
		});
		// The Validity SEQUENCE body should not be visited
		expect(types).not.toContain("sequence");
	});

	it("walkCst can collect all referenced type names", () => {
		const { cst } = parseModule(X501_NAME_MODULE);
		const refs = new Set<string>();
		walkCst(cst, {
			onType: (t) => {
				if (t.kind === "referencedType") refs.add(t.name.text);
			},
		});
		expect(refs.has("AttributeType")).toBe(true);
		expect(refs.has("AttributeValue")).toBe(true);
	});
});
