import { expect, suite, test } from "vitest";

import { fileContentEqual } from "./file-content-equal.js";

suite("fileContentEqual", () => {
	test("should return true for identical content", async () => {
		const path = `${__dirname}/__fixtures__/test-file.txt`;
		const data = Buffer.from("Hello, World!");

		const result = await fileContentEqual(path, data);
		expect(result).toBe(true);
	});

	test("should return false for different content", async () => {
		const path = `${__dirname}/__fixtures__/test-file.txt`;
		const data = Buffer.from("Goodbye, World!");

		const result = await fileContentEqual(path, data);
		expect(result).toBe(false);
	});

	test("should return false for different sizes", async () => {
		const path = `${__dirname}/__fixtures__/test-file.txt`;
		const data = Buffer.from("Hello");

		const result = await fileContentEqual(path, data);
		expect(result).toBe(false);
	});

	test("should return true for empty file and empty buffer", async () => {
		const path = `${__dirname}/__fixtures__/empty-file.txt`;
		const data = Buffer.from("");

		const result = await fileContentEqual(path, data);
		expect(result).toBe(true);
	});
});
