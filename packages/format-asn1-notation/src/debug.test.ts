import { describe, it, expect } from "vitest";

import { parseModule } from "./index.js";

describe("debug", () => {
	it("parses SET SIZE (1..MAX) OF in minimal module", () => {
		const src = `Test DEFINITIONS IMPLICIT TAGS ::= BEGIN
Foo ::= SET SIZE (1..MAX) OF Bar
END`;
		const { cst, errors } = parseModule(src);
		console.log(
			"errors:",
			errors.map((e) => e.message + " at " + JSON.stringify(e.span)),
		);
		console.log(
			"assignments:",
			cst.body.assignments.map((a) => ({
				name: a.name.text,
				kind: a.type.kind,
			})),
		);
		expect(errors).toHaveLength(0);
	});

	it("parses SET SIZE preceded by SEQUENCE OF", () => {
		const src = `Test DEFINITIONS IMPLICIT TAGS ::= BEGIN
A ::= SEQUENCE OF B
B ::= SET SIZE (1..MAX) OF C
END`;
		const { cst, errors } = parseModule(src);
		console.log(
			"errors:",
			errors.map((e) => e.message + " at " + JSON.stringify(e.span)),
		);
		console.log(
			"assignments:",
			cst.body.assignments.map((a) => ({
				name: a.name.text,
				kind: a.type.kind,
			})),
		);
		expect(errors).toHaveLength(0);
	});
});
