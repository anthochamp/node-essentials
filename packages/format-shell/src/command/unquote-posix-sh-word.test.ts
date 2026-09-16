import { expect, suite, test } from "vitest";

import { escapePosixShCommandArg } from "./escape-posix-sh-command-arg.js";
import { unquotePosixShWord } from "./unquote-posix-sh-word.js";

suite("unquotePosixShWord", () => {
	test("should undo single quotes", () => {
		expect(unquotePosixShWord("'simple'")).toBe("simple");
		expect(unquotePosixShWord("''")).toBe("");
		expect(unquotePosixShWord("'$HOME `id`'")).toBe("$HOME `id`");
		expect(unquotePosixShWord("'no \\n escape'")).toBe("no \\n escape");
	});

	test("should undo the concatenated form an escaped quote produces", () => {
		expect(unquotePosixShWord("'it'\\''s'")).toBe("it's");
		expect(unquotePosixShWord("it\\'s")).toBe("it's");
		expect(unquotePosixShWord("'a'\\''b'\\''c'")).toBe("a'b'c");
	});

	test("should undo double quotes and their four escapes", () => {
		expect(unquotePosixShWord('"simple"')).toBe("simple");
		expect(unquotePosixShWord('"has \\"quote\\""')).toBe('has "quote"');
		expect(unquotePosixShWord('"costs \\$5"')).toBe("costs $5");
		// A backslash before anything else is literal inside double quotes.
		expect(unquotePosixShWord('"no \\n escape"')).toBe("no \\n escape");
	});

	test("should take the rest of an unterminated quote", () => {
		expect(unquotePosixShWord("'unterminated")).toBe("unterminated");
		expect(unquotePosixShWord('"unterminated')).toBe("unterminated");
	});

	test("should invert escapePosixShCommandArg", () => {
		const values = [
			"",
			"simple",
			"needs quoting",
			"it's",
			"a'b'c",
			"''''",
			'$HOME `id` \\ "q"',
			"line1\nline2",
		];

		for (const value of values) {
			expect(unquotePosixShWord(escapePosixShCommandArg(value))).toBe(value);
		}
	});
});
