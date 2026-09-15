import { expect, suite, test } from "vitest";

import { PluralFormsSyntaxError } from "./errors.js";
import { DEFAULT_PLURAL_FORMS, parsePluralForms } from "./plural-forms.js";

/** Which form each count selects, for the counts a rule normally splits on. */
function forms_(rule: string, counts: readonly number[]): number[] {
	const plural = parsePluralForms(rule);
	return counts.map(plural.select);
}

suite("parsePluralForms", () => {
	test("reads the English rule", () => {
		const plural = parsePluralForms("nplurals=2; plural=(n != 1);");
		expect(plural.count).toBe(2);
		expect(forms_("nplurals=2; plural=(n != 1);", [0, 1, 2, 21])).toEqual([
			1, 0, 1, 1,
		]);
	});

	test("reads a rule with a single form", () => {
		expect(forms_("nplurals=1; plural=0;", [0, 1, 5])).toEqual([0, 0, 0]);
	});

	test("reads the French rule, where zero is singular", () => {
		expect(forms_("nplurals=2; plural=(n > 1);", [0, 1, 2])).toEqual([0, 0, 1]);
	});

	test("reads the Russian rule, with modulo and nested conditionals", () => {
		const rule =
			"nplurals=3; plural=(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2);";
		expect(parsePluralForms(rule).count).toBe(3);
		expect(forms_(rule, [1, 21, 2, 24, 5, 11, 111])).toEqual([
			0, 0, 1, 1, 2, 2, 2,
		]);
	});

	test("reads the Arabic rule, with six forms", () => {
		const rule =
			"nplurals=6; plural=n==0 ? 0 : n==1 ? 1 : n==2 ? 2 : n%100>=3 && n%100<=10 ? 3 : n%100>=11 ? 4 : 5;";
		expect(forms_(rule, [0, 1, 2, 3, 11, 100])).toEqual([0, 1, 2, 3, 4, 5]);
	});

	test("applies C precedence rather than left-to-right", () => {
		expect(forms_("nplurals=2; plural=1 + 1 * 2 == 3;", [0])).toEqual([1]);
	});

	test("reads logical negation", () => {
		expect(forms_("nplurals=2; plural=!(n == 1);", [1, 2])).toEqual([0, 1]);
	});

	test("truncates integer division", () => {
		expect(forms_("nplurals=4; plural=n / 2;", [0, 3, 5])).toEqual([0, 1, 2]);
	});

	test("clamps a result outside the declared form count", () => {
		expect(forms_("nplurals=2; plural=n;", [0, 1, 9])).toEqual([0, 1, 1]);
	});

	test("tolerates a missing trailing semicolon", () => {
		expect(parsePluralForms("nplurals=2; plural=n != 1").count).toBe(2);
	});

	test("rejects a field it cannot parse", () => {
		for (const rule of [
			"plural=(n != 1);",
			"nplurals=0; plural=0;",
			"nplurals=2;",
			"nplurals=2; plural=(n != 1;",
			"nplurals=2; plural=;",
			"nplurals=2; plural=n != 1 extra;",
		]) {
			expect(() => parsePluralForms(rule)).toThrow(PluralFormsSyntaxError);
		}
	});
});

suite("DEFAULT_PLURAL_FORMS", () => {
	test("matches the English rule gettext assumes", () => {
		expect(DEFAULT_PLURAL_FORMS.count).toBe(2);
		expect([0, 1, 2].map(DEFAULT_PLURAL_FORMS.select)).toEqual([1, 0, 1]);
	});
});
