import { expect, suite, test } from "vitest";

import { escapePosixPath } from "./escape-posix-path.js";

suite("escapePosixPath", () => {
	test("should escape / and null characters", () => {
		expect(escapePosixPath("my/file\0name")).toBe("my_file_name");
	});

	test("should replace . and .. with _., _.. respectively", () => {
		expect(escapePosixPath(".")).toBe("_.");
		expect(escapePosixPath("..")).toBe("_..");
	});

	test("should truncate names longer than 255 characters", () => {
		const longName = "a".repeat(300);
		expect(escapePosixPath(longName).length).toBe(255);
	});

	test("should not modify valid names", () => {
		expect(escapePosixPath("valid_filename.txt")).toBe("valid_filename.txt");
	});
});
