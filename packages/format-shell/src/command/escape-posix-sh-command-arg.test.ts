import { expect, suite, test } from "vitest";

import { escapePosixShCommandArg } from "./escape-posix-sh-command-arg.js";

suite("escapePosixShCommandArg", () => {
	test("should escape a string for safe use as a POSIX-compliant shell argument", () => {
		expect(escapePosixShCommandArg("")).toBe("''");
		expect(escapePosixShCommandArg("simple")).toBe("'simple'");
		expect(escapePosixShCommandArg("space string")).toBe("'space string'");
		expect(escapePosixShCommandArg("test's")).toBe("'test'\\''s'");
		expect(escapePosixShCommandArg("a'b'c")).toBe("'a'\\''b'\\''c'");
		expect(escapePosixShCommandArg("''''")).toBe("''\\'''\\'''\\'''\\'''");
		expect(escapePosixShCommandArg("line1\nline2")).toBe("'line1\nline2'");
		expect(
			escapePosixShCommandArg("complex $tring! with #special& chars"),
		).toBe("'complex $tring! with #special& chars'");
	});
});
