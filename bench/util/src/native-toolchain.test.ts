import { stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { prepareNativeToolchains } from "./native-toolchain.js";

const BINARY = process.platform === "win32" ? "cmd" : "sh";
const THIS_FILE = fileURLToPath(import.meta.url);

describe("prepareNativeToolchains", () => {
	it("returns an interpreted program for a candidate found on PATH", async () => {
		const programs = await prepareNativeToolchains([
			{
				language: "Shell",
				sourcePath: "/fake/script.sh",
				candidates: [BINARY],
			},
		]);

		expect(programs).toEqual([
			{ language: "Shell", command: BINARY, baseArgs: ["/fake/script.sh"] },
		]);
	});

	it("skips a spec whose candidates are not found on PATH", async () => {
		const programs = await prepareNativeToolchains([
			{
				language: "Nonexistent",
				sourcePath: "/fake/script",
				candidates: ["this-binary-does-not-exist-anywhere"],
			},
		]);

		expect(programs).toEqual([]);
	});

	it("tries candidates in order, using the first one found", async () => {
		const programs = await prepareNativeToolchains([
			{
				language: "Shell",
				sourcePath: "/fake/script.sh",
				candidates: ["this-binary-does-not-exist-anywhere", BINARY],
			},
		]);

		expect(programs).toEqual([
			{ language: "Shell", command: BINARY, baseArgs: ["/fake/script.sh"] },
		]);
	});

	it("compiles via the compile step and returns the built binary", async () => {
		const programs = await prepareNativeToolchains([
			{
				language: "Copy",
				sourcePath: THIS_FILE,
				candidates: [BINARY],
				compile: (compiler, sourcePath, outBinary) => ({
					command: compiler,
					args: ["-c", `cp "${sourcePath}" "${outBinary}"`],
				}),
			},
		]);

		expect(programs).toHaveLength(1);
		expect(programs[0]?.language).toBe("Copy");
		expect(programs[0]?.baseArgs).toEqual([]);
		await expect(stat(programs[0]!.command)).resolves.toBeDefined();
	});

	it("skips a spec whose compile step fails, without throwing", async () => {
		const programs = await prepareNativeToolchains([
			{
				language: "Broken",
				sourcePath: "/fake/script",
				candidates: [BINARY],
				compile: (compiler) => ({ command: compiler, args: ["-c", "exit 1"] }),
			},
		]);

		expect(programs).toEqual([]);
	});

	it("filters through an async verify hook", async () => {
		const programs = await prepareNativeToolchains(
			[
				{ language: "A", sourcePath: "/fake/a", candidates: [BINARY] },
				{ language: "B", sourcePath: "/fake/b", candidates: [BINARY] },
			],
			{ verify: (program) => Promise.resolve(program.language === "A") },
		);

		expect(programs.map((program) => program.language)).toEqual(["A"]);
	});
});
