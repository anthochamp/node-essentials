import { afterEach, expect, suite, test } from "vitest";

import { parseEditorConfig } from "./parse-editorconfig.js";

type Polluted = { polluted?: unknown };

afterEach(() => {
	delete (Object.prototype as Polluted).polluted;
});

suite("EditorConfig prototype pollution", () => {
	test("should keep an unknown __proto__ property as an own entry", () => {
		const file = parseEditorConfig("[*]\n__proto__ = polluted\n");
		const unknown = file.sections[0]?.properties.unknown as Record<
			string,
			string
		>;

		expect(({} as Polluted).polluted).toBeUndefined();
		expect(Object.getPrototypeOf(unknown)).toBe(Object.prototype);
		expect(unknown["__proto__"]).toBe("polluted");
	});
});
