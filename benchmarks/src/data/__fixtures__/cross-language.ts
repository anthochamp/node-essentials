/**
 * Cross-language reference programs — lazy singleton.
 *
 * Both cross-language bench files (queue and heap) share one call to
 * `getReferencePrograms()`. The first one to await it compiles the native
 * programs (via `@ac-bench/util`'s `prepareNativeToolchains`); every later
 * call, including from the sibling file, returns the same cached result.
 */

import assert from "node:assert";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { SpawnBaseline } from "@ac-bench/measure-duration";
import {
	checksum,
	DEFAULT_SEED,
	type NativeProgram,
	prepareNativeToolchains,
	randomUint32Values,
	sequentialChecksum,
} from "@ac-bench/util";
import { spawnProcess } from "@ac-kit/node";

/** Directory holding the non-JavaScript reference programs. */
export const nativeSourceDir = fileURLToPath(
	new URL("./native/", import.meta.url),
);

export interface ReferencePrograms {
	programs: readonly NativeProgram[];
	baselines: readonly SpawnBaseline[];
}

let cache: Promise<ReferencePrograms | null> | null = null;

/**
 * Returns the prepared reference condition, or `null` when no toolchain is
 * found.
 */
export function getReferencePrograms(): Promise<ReferencePrograms | null> {
	if (cache === null) {
		cache = initReferencePrograms();
	}
	return cache;
}

async function initReferencePrograms(): Promise<ReferencePrograms | null> {
	const programs = await prepareNativeToolchains(
		[
			{
				language: "Python",
				sourcePath: join(nativeSourceDir, "workload.py"),
				candidates: ["python3"],
			},
			{
				language: "C++",
				sourcePath: join(nativeSourceDir, "workload.cpp"),
				candidates: ["g++", "clang++"],
				compile: (compiler, sourcePath, outBinary) => ({
					command: compiler,
					args: ["-O2", "-std=c++20", "-o", outBinary, sourcePath],
				}),
			},
			{
				language: "Rust",
				sourcePath: join(nativeSourceDir, "workload.rs"),
				candidates: ["rustc"],
				compile: (compiler, sourcePath, outBinary) => ({
					command: compiler,
					args: ["-O", "--edition", "2021", "-o", outBinary, sourcePath],
				}),
			},
		],
		{ verify },
	);

	if (programs.length === 0) {
		return null;
	}

	return {
		programs,
		baselines: programs.map((program) => ({
			name: program.language,
			command: program.command,
			args: [...program.baseArgs, "noop", "0"],
		})),
	};
}

export async function invokeAndAssertStdoutNumber(
	program: NativeProgram,
	mode: string,
	count: number,
	wanted: number,
): Promise<void> {
	const { stdout } = await spawnProcess(program.command, [
		...program.baseArgs,
		mode,
		String(count),
	]);
	assert.strictEqual(Number.parseInt(stdout.trim(), 10), wanted);
}

async function verify(program: NativeProgram): Promise<boolean> {
	const probe = 1000;
	try {
		await invokeAndAssertStdoutNumber(
			program,
			"queue",
			probe,
			sequentialChecksum(probe),
		);
		await invokeAndAssertStdoutNumber(
			program,
			"heap",
			probe,
			checksum(randomUint32Values(probe, DEFAULT_SEED)),
		);
		return true;
	} catch (error) {
		process.stderr.write(
			`${program.language} reference rejected: ${String(error)}\n`,
		);
		return false;
	}
}
