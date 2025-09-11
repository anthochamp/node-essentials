import { describe, expect, it } from "vitest";

import { fileContentEqual } from "./file-content-equal.js";

describe("fileContentEqual", () => {
	it("should return true for identical content", async () => {
		const path = `${__dirname}/__fixtures__/test-file.txt`;
		const data = Buffer.from("Hello, World!");

		const result = await fileContentEqual(path, data);
		expect(result).toBe(true);
	});

	it("should return false for different content", async () => {
		const path = `${__dirname}/__fixtures__/test-file.txt`;
		const data = Buffer.from("Goodbye, World!");

		const result = await fileContentEqual(path, data);
		expect(result).toBe(false);
	});

	it("should return false for different sizes", async () => {
		const path = `${__dirname}/__fixtures__/test-file.txt`;
		const data = Buffer.from("Hello");

		const result = await fileContentEqual(path, data);
		expect(result).toBe(false);
	});

	it("should return true for empty file and empty buffer", async () => {
		const path = `${__dirname}/__fixtures__/empty-file.txt`;
		const data = Buffer.from("");

		const result = await fileContentEqual(path, data);
		expect(result).toBe(true);
	});
});
