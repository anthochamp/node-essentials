import { chmod, writeFile } from "node:fs/promises";
import * as path from "node:path";

import { createTempDir } from "@ac-kit/node";
import { expect, suite, test } from "vitest";

import { hasBinary } from "./has-binary.js";

suite("hasBinary", () => {
	test("returns true for a binary present on PATH", async () => {
		const binaryName = process.platform === "win32" ? "cmd" : "sh";
		expect(await hasBinary(binaryName)).toBe(true);
	});

	test("returns false for a binary that does not exist", async () => {
		expect(await hasBinary("this-binary-does-not-exist-anywhere")).toBe(false);
	});

	test("uses the given env's PATH for resolution", async () => {
		const dir = await createTempDir("has-binary-test-");
		const name =
			process.platform === "win32" ? "my-test-binary.cmd" : "my-test-binary";
		const scriptPath = path.join(dir, name);
		await writeFile(
			scriptPath,
			process.platform === "win32" ? "@echo off\n" : "#!/bin/sh\n",
		);
		if (process.platform !== "win32") {
			await chmod(scriptPath, 0o755);
		}

		// The resolver binary (`which`/`where`) is itself resolved via the given
		// env's PATH, so it must stay reachable too — only prepend, never replace.
		const pathWithDir = `${dir}${path.delimiter}${process.env.PATH ?? ""}`;

		expect(await hasBinary(name, { env: { PATH: pathWithDir } })).toBe(true);
		expect(await hasBinary(name, { env: { PATH: process.env.PATH } })).toBe(
			false,
		);
	});

	test("rejects when aborted via signal", async () => {
		const controller = new AbortController();
		controller.abort();

		await expect(
			hasBinary("sh", { signal: controller.signal }),
		).rejects.toThrow();
	});
});
