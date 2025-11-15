import { expect, suite, test } from "vitest";
import { importModule } from "./import-module.js";

suite("importModule", () => {
	test("should load a module without resolve paths", async () => {
		await importModule("vitest");
	});

	test("should throw if the module cannot be found because of an invalid path", async () => {
		await expect(
			importModule("vitest", ["this-is-an-invalid-path"]),
		).rejects.toThrow();
	});

	test("should throw if the module cannot be found", async () => {
		await expect(importModule("unknown-module", [__dirname])).rejects.toThrow();
	});

	test("should throw if the module cannot be found without resolve paths", async () => {
		await expect(importModule("unknown-module")).rejects.toThrow();
	});
});
