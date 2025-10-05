import { expect, suite, test } from "vitest";
import { escapePosixPath, escapeWin32Path } from "./escape-path.js";

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

suite("escapeWin32Path", () => {
	test("should escape invalid characters", () => {
		expect(escapeWin32Path("my<file>name?.txt")).toBe("my_file_name_.txt");
	});

	test("should replace reserved names", () => {
		expect(escapeWin32Path("CON")).toBe("_CON");
		expect(escapeWin32Path("LPT1.txt")).toBe("_LPT1.txt");
	});

	test("should trim trailing spaces and dots", () => {
		expect(escapeWin32Path("filename. ")).toBe("filename_");
		expect(escapeWin32Path("filename   ")).toBe("filename_");
	});

	test("should truncate names longer than 255 characters", () => {
		const longName = "a".repeat(300);
		expect(escapeWin32Path(longName).length).toBe(255);
	});

	test("should not modify valid names", () => {
		expect(escapeWin32Path("valid_filename.txt")).toBe("valid_filename.txt");
	});
});
