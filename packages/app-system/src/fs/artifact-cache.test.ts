import { readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
	createTempDir,
	forkProcess,
	isDirectoryAsync,
	type PathFilter,
	spawnProcess,
	walkPaths,
} from "@ac-kit/node";
import { afterEach, beforeEach, expect, suite, test, vi } from "vitest";

import {
	type ArtifactResolution,
	ArtifactRunScopeUnavailableError,
	createArtifactCache,
} from "./artifact-cache.js";

const RACER = fileURLToPath(
	new URL("./__fixtures__/artifact-cache-racer.ts", import.meta.url),
);

suite("createArtifactCache", () => {
	let tempDir: string;
	let root: string;

	const rootEntries = (include?: PathFilter) =>
		Array.fromAsync(
			walkPaths({ root, include, unreadable: "skip" }),
			(walked) => walked.path,
		);

	beforeEach(async () => {
		tempDir = await createTempDir("artifact-cache-test");
		root = join(tempDir, "cache");
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	test("builds once and reuses the result on the next call", async () => {
		const resolutions: ArtifactResolution[] = [];
		const cache = createArtifactCache({
			root,
			onResolved: (resolution) => resolutions.push(resolution),
		});
		const key = { name: "Reference Program", inputs: ["source v1"] };

		let builds = 0;
		const build = async (staging: string): Promise<void> => {
			builds++;
			await writeFile(join(staging, "out.txt"), "compiled");
		};

		const first = await cache.ensure(key, build);
		const second = await cache.ensure(key, build);

		expect(second).toBe(first);
		expect(builds).toBe(1);
		expect(await readFile(join(first, "out.txt"), "utf8")).toBe("compiled");
		expect(resolutions.map((resolution) => resolution.cacheHit)).toEqual([
			false,
			true,
		]);
	});

	test("names the directory after the key and hashes the identity into it", async () => {
		const cache = createArtifactCache({ root });
		const directory = await cache.ensure(
			{ name: "Reference Program", inputs: ["source v1"] },
			async () => {},
		);

		expect(dirname(directory)).toBe(root);
		expect(basename(directory)).toMatch(/^reference-program-[0-9a-f]{20}$/);
	});

	test("a change to any identity component yields a different artifact", async () => {
		const cache = createArtifactCache({ root });
		const noop = async (): Promise<void> => {};

		const base = await cache.ensure({ name: "p", inputs: ["v1"] }, noop);
		const otherInput = await cache.ensure({ name: "p", inputs: ["v2"] }, noop);
		const otherScope = await cache.ensure(
			{ name: "p", inputs: ["v1"], scope: ["gcc-14"] },
			noop,
		);

		expect(otherInput).not.toBe(base);
		expect(otherScope).not.toBe(base);
	});

	test("the artifact name is not part of the identity", async () => {
		const cache = createArtifactCache({ root });
		const noop = async (): Promise<void> => {};

		const first = await cache.ensure({ name: "one", inputs: ["v1"] }, noop);
		const second = await cache.ensure(
			{ name: "another", inputs: ["v1"] },
			noop,
		);

		expect(basename(second).replace("another-", "")).toBe(
			basename(first).replace("one-", ""),
		);
	});

	test("a run-scoped artifact lands under runRoot and is distinct per run", async () => {
		const key = { name: "p", inputs: ["v1"], lifetime: "run" } as const;
		const noop = async (): Promise<void> => {};

		const first = createArtifactCache({ root, runId: "run-a" });
		const second = createArtifactCache({ root, runId: "run-b" });

		const inFirst = await first.ensure(key, noop);
		const inSecond = await second.ensure(key, noop);

		expect(first.runRoot).toBe(join(root, "run-run-a"));
		expect(dirname(inFirst)).toBe(first.runRoot);
		expect(inSecond).not.toBe(inFirst);
	});

	test("a run-scoped artifact is refused when the cache has no run id", async () => {
		const cache = createArtifactCache({ root });

		expect(cache.runRoot).toBeNull();
		await expect(
			cache.ensure(
				{ name: "p", inputs: ["v1"], lifetime: "run" },
				async () => {},
			),
		).rejects.toBeInstanceOf(ArtifactRunScopeUnavailableError);
	});

	test("a failed build leaves nothing behind and propagates the error", async () => {
		const cache = createArtifactCache({ root });
		const failure = new Error("compiler exploded");

		await expect(
			cache.ensure({ name: "p", inputs: ["v1"] }, async (staging) => {
				await writeFile(join(staging, "partial.txt"), "half a file");
				throw failure;
			}),
		).rejects.toBe(failure);

		await expect(rootEntries()).resolves.toEqual([]);
	});

	test("an already-aborted signal prevents the build", async () => {
		const cache = createArtifactCache({ root });
		let built = false;

		await expect(
			cache.ensure(
				{ name: "p", inputs: ["v1"] },
				async () => {
					built = true;
				},
				AbortSignal.abort(),
			),
		).rejects.toThrow();

		expect(built).toBe(false);
	});

	test("the build receives a signal even when the caller gives none", async () => {
		const cache = createArtifactCache({ root });
		const received: AbortSignal[] = [];

		await cache.ensure({ name: "p", inputs: ["v1"] }, async (_, signal) => {
			received.push(signal);
		});

		expect(received[0]).toBeInstanceOf(AbortSignal);
		expect(received[0]?.aborted).toBe(false);
	});

	test("racing processes converge on one artifact and build it once", async () => {
		const markerFile = join(tempDir, "builds.txt");
		await writeFile(markerFile, "");

		const racers = await Promise.all(
			Array.from({ length: 4 }, () =>
				spawnProcess(
					process.execPath,
					["--import", "tsx", RACER, root, markerFile],
					// `tsx` resolves from the child's cwd, which must be this package.
					{ cwd: dirname(RACER) },
				),
			),
		);

		const directories = new Set(racers.map((racer) => racer.stdout.trimEnd()));
		const builds = (await readFile(markerFile, "utf8"))
			.split("\n")
			.filter((line) => line !== "");
		const directory = [...directories][0]!;

		expect(directories.size).toBe(1);
		await expect(isDirectoryAsync(directory)).resolves.toBe(true);
		await expect(
			readFile(join(directory, "artifact.txt"), "utf8"),
		).resolves.toBe("ok");
		expect(builds).toHaveLength(1);
		await expect(rootEntries()).resolves.toEqual([basename(directory)]);
	}, 30_000);

	test("a lock left by a killed builder delays the next caller but never stalls it", async () => {
		const markerFile = join(tempDir, "builds.txt");
		await writeFile(markerFile, "");

		const hung = await forkProcess(RACER, {
			args: [root, markerFile, "hang"],
			execArgv: ["--import", "tsx"],
			cwd: dirname(RACER),
		});

		// The lock exists only once the holder is inside `build`.
		await vi.waitFor(async () =>
			expect(await readFile(markerFile, "utf8")).toContain("hang"),
		);
		const lockFiles = await rootEntries(/\.lock$/);
		expect(lockFiles).toHaveLength(1);

		// SIGTERM is ignored by `hang`, so this escalates to SIGKILL: no unlock runs.
		await hung.terminate(50);
		await expect(rootEntries(/\.lock$/)).resolves.toEqual(lockFiles);

		const startedAt = Date.now();
		const survivor = await spawnProcess(
			process.execPath,
			["--import", "tsx", RACER, root, markerFile, "build", "500"],
			{ cwd: dirname(RACER) },
		);
		const elapsed = Date.now() - startedAt;

		expect(survivor.code).toBe(0);
		await expect(
			readFile(join(survivor.stdout.trimEnd(), "artifact.txt"), "utf8"),
		).resolves.toBe("ok");
		// It waited out the budget rather than returning instantly, and did not
		// wait forever on a lock nothing will ever unlink.
		expect(elapsed).toBeGreaterThanOrEqual(500);
	}, 30_000);

	test("lockWaitMs 0 skips the lock entirely", async () => {
		const cache = createArtifactCache({ root, lockWaitMs: 0 });
		const directory = await cache.ensure(
			{ name: "p", inputs: ["v1"] },
			async (staging) => {
				await writeFile(join(staging, "out.txt"), "built");
			},
		);

		await expect(readFile(join(directory, "out.txt"), "utf8")).resolves.toBe(
			"built",
		);
		await expect(rootEntries(/\.lock$/)).resolves.toEqual([]);
	});

	test("the lock file is removed once the build completes", async () => {
		const cache = createArtifactCache({ root });
		await cache.ensure({ name: "p", inputs: ["v1"] }, async () => {});

		await expect(rootEntries(/\.lock$/)).resolves.toEqual([]);
	});

	test("a failed build still releases the lock", async () => {
		const cache = createArtifactCache({ root });

		await expect(
			cache.ensure({ name: "p", inputs: ["v1"] }, async () => {
				throw new Error("compiler exploded");
			}),
		).rejects.toThrow();

		await expect(rootEntries(/\.lock$/)).resolves.toEqual([]);
	});
});
