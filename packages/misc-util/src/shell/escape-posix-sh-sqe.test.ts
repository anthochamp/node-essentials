import { describe, expect, it } from "vitest";
import { escapePosixShSqe } from "./escape-posix-sh-sqe.js";

describe("escapePosixShSqe", () => {
	it("should escape single quotes in a string for safe use in a shell command", () => {
		expect(escapePosixShSqe("simple")).toBe("simple");
		expect(escapePosixShSqe("it's")).toBe("it'\\''s");
		expect(escapePosixShSqe("a'b'c")).toBe("a'\\''b'\\''c");
		expect(escapePosixShSqe("''''")).toBe("'\\'''\\'''\\'''\\''");
	});
});
