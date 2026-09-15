/**
 * Detects and, where needed, compiles a runnable reference program per
 * toolchain spec — the machinery shared by every cross-language benchmark
 * fixture in this workspace (a duration comparison is only meaningful once a
 * program to compare against exists and actually runs).
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { ArtifactCache, ArtifactKey } from "@ac-kit/app-system";
import { createArtifactCache, hasBinary } from "@ac-kit/app-system";
import { slugify } from "@ac-kit/core";
import { spawnProcess } from "@ac-kit/node";

/** One candidate reference implementation, interpreted or compiled from source. */
export interface NativeToolchainSpec {
	/** Attribution label carried into `NativeProgram.language`, e.g. `"C++"`. */
	language: string;

	/** Absolute path to the reference program's source file. */
	sourcePath: string;

	/**
	 * Binaries tried in order; the first one found on `PATH` is used. For an
	 * interpreted toolchain this is the interpreter itself (e.g. `["python3"]`);
	 * for a compiled one, the candidate compilers (e.g. `["g++", "clang++"]`).
	 */
	candidates: readonly string[];

	/**
	 * Builds the compile command for whichever candidate was found. Omit for an
	 * interpreted toolchain, where `sourcePath` is invoked directly as the
	 * program's first argument instead.
	 */
	compile?: (
		compiler: string,
		sourcePath: string,
		outBinary: string,
	) => { command: string; args: readonly string[] };
}

/**
 * A reference program ready to spawn: `command` with `baseArgs` prepended to
 * any call.
 */
export interface NativeProgram {
	language: string;
	command: string;
	baseArgs: readonly string[];
}

export interface PrepareNativeToolchainsOptions {
	/**
	 * Keeps only the programs that pass, e.g. a smoke test comparing against a
	 * known result. Every detected/compiled program is kept when omitted.
	 */
	verify?: (program: NativeProgram) => Promise<boolean>;

	/**
	 * Where compiled programs are cached. Supply the runner's own cache to share
	 * one compile across every process of a run; omitted, a persistent cache
	 * under `node_modules/.cache/ac-bench` is used.
	 */
	cache?: ArtifactCache;
}

const DEFAULT_CACHE_ROOT = join("node_modules", ".cache", "ac-bench");

/** Best-effort, for the artifact identity: a compiler upgrade must invalidate. */
async function probeVersion(compiler: string): Promise<string> {
	try {
		return (await spawnProcess(compiler, ["--version"])).stdout;
	} catch {
		return "";
	}
}

/**
 * Detects, and where a `compile` step is declared compiles, one
 * {@link NativeProgram} per spec whose first matching candidate is found on
 * `PATH` — specs with no candidate found are silently skipped, and a spec whose
 * compile step fails is reported to `stderr` and skipped rather than failing
 * the whole batch, since a benchmark should degrade to comparing fewer
 * languages rather than not comparing at all when one toolchain is missing.
 *
 * Compiled outputs are content-addressed by source text, compiler, compiler
 * version and compile flags, so a program survives across runs and is rebuilt
 * exactly when one of those changes. Nothing is written outside the cache
 * root.
 *
 * Call once per distinct spec set and memoize the result in the caller (a lazy
 * module-level singleton, as every consumer here already does) — the artifact
 * cache spares the compile, not the detection work.
 */
export async function prepareNativeToolchains(
	specs: readonly NativeToolchainSpec[],
	options: PrepareNativeToolchainsOptions = {},
): Promise<readonly NativeProgram[]> {
	const cache =
		options.cache ?? createArtifactCache({ root: DEFAULT_CACHE_ROOT });
	const programs: NativeProgram[] = [];

	for (const spec of specs) {
		let found: string | null = null;
		for (const candidate of spec.candidates) {
			if (await hasBinary(candidate)) {
				found = candidate;
				break;
			}
		}
		if (found === null) {
			continue;
		}

		if (!spec.compile) {
			programs.push({
				language: spec.language,
				command: found,
				baseArgs: [spec.sourcePath],
			});
			continue;
		}

		const compile = spec.compile;
		const binaryName = slugify(spec.language, { fallback: "program" });

		try {
			const directory = await cache.ensure(
				await buildArtifactKey(spec, compile, found, binaryName),
				async (staging, signal) => {
					const { command, args } = compile(
						found,
						spec.sourcePath,
						join(staging, binaryName),
					);
					await spawnProcess(command, args, { signal });
				},
			);

			programs.push({
				language: spec.language,
				command: join(directory, binaryName),
				baseArgs: [],
			});
		} catch (error) {
			process.stderr.write(
				`${spec.language} reference not built: ${String(error)}\n`,
			);
		}
	}

	if (!options.verify) {
		return programs;
	}

	const usable: NativeProgram[] = [];
	for (const program of programs) {
		if (await options.verify(program)) {
			usable.push(program);
		}
	}
	return usable;
}

async function buildArtifactKey(
	spec: NativeToolchainSpec,
	compile: NonNullable<NativeToolchainSpec["compile"]>,
	compiler: string,
	binaryName: string,
): Promise<ArtifactKey> {
	// The real output path differs per attempt, so the identity uses a fixed
	// placeholder — otherwise no two calls could ever agree on a key.
	const { command, args } = compile(
		compiler,
		spec.sourcePath,
		join("<artifact>", binaryName),
	);

	return {
		name: spec.language,
		inputs: [
			await readSourceOrPath(spec.sourcePath),
			compiler,
			await probeVersion(compiler),
			command,
			...args,
		],
	};
}

/**
 * An unreadable source still gets an identity: the compile is about to fail on
 * it anyway, and a failed build is never cached.
 */
async function readSourceOrPath(sourcePath: string): Promise<string> {
	try {
		return await readFile(sourcePath, "utf8");
	} catch {
		return `\u0000unreadable:${sourcePath}`;
	}
}
