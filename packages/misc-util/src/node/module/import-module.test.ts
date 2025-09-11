import { describe, expect, it } from "vitest";
import { importModule } from "./import-module.js";

describe("importModule", () => {
	it("should load a module without resolve paths", async () => {
		await expect(importModule("vitest")).resolves.not.toThrow();
	});

	it("should throw if the module cannot be found because of an invalid path", async () => {
		await expect(
			importModule("vitest", ["this-is-an-invalid-path"]),
		).rejects.toThrow();
	});

	it("should throw if the module cannot be found", async () => {
		await expect(importModule("unknown-module", [__dirname])).rejects.toThrow();
	});

	it("should throw if the module cannot be found without resolve paths", async () => {
		await expect(importModule("unknown-module")).rejects.toThrow();
	});
});
