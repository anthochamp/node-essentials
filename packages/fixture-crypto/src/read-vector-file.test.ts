import { describe, expect, it } from "vitest";

import { readVectorFile } from "./read-vector-file.js";

describe("readVectorFile", () => {
	it("reads a file out of a fetched fixture corpus", async () => {
		const content = await readVectorFile(
			"cavp-shs-byte-test-vectors",
			"shabytetestvectors/SHA256ShortMsg.rsp",
		);

		expect(content).toContain("SHA-256 ShortMsg");
	});

	it("throws when the fixture has not been fetched", async () => {
		await expect(
			readVectorFile("not-a-real-fixture-id", "whatever.rsp"),
		).rejects.toThrow(/setup/);
	});

	it("throws when the file does not exist within a fetched fixture", async () => {
		await expect(
			readVectorFile("cavp-shs-byte-test-vectors", "does-not-exist.rsp"),
		).rejects.toThrow(/not present/);
	});
});
