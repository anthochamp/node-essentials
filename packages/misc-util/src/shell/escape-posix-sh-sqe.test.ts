import { expect, suite, test } from "vitest";
import { escapePosixShSqe } from "./escape-posix-sh-sqe.js";

suite("escapePosixShSqe", () => {
	test("should escape single quotes in a string for safe use in a shell command", () => {
		expect(escapePosixShSqe("simple")).toBe("simple");
		expect(escapePosixShSqe("test's")).toBe("test'\\''s");
		expect(escapePosixShSqe("a'b'c")).toBe("a'\\''b'\\''c");
		expect(escapePosixShSqe("''''")).toBe("'\\'''\\'''\\'''\\''");
	});
});
