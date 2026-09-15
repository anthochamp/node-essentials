import { mkdir, rename, rm } from "node:fs/promises";
import { join, resolve as resolvePath } from "node:path";

import {
	concatBytes,
	encodeTextUtf8,
	setUint32Be,
	slugify,
} from "@ac-kit/core";
import { sha256 } from "@ac-kit/crypto-hash";
import { createTempDir, isDirectoryAsync } from "@ac-kit/node";

import { FileLock } from "../async/file-lock.js";

export type ArtifactLifetime =
	/** Content-addressed; survives across runs. */
	| "persistent"
	/** Additionally scoped to the current run; removed when the run ends. */
	| "run";

export type ArtifactKey = {
	/** Author-chosen, for a readable cache directory. Not part of identity. */
	readonly name: string;
	/**
	 * Everything the artifact depends on — source text, compiler flags, toolchain
	 * version. Hashed to form the identity.
	 */
	readonly inputs: readonly (string | Uint8Array)[];
	/** Extra identity components. Node version, platform and arch are implicit. */
	readonly scope?: readonly string[];
	/** Default `"persistent"`. */
	readonly lifetime?: ArtifactLifetime;
};

export type ArtifactResolution = {
	readonly key: ArtifactKey;
	readonly directory: string;
	/**
	 * False when this call ran `build`. A cold first run is not comparable with a
	 * warm one, so a consumer that reports timings records this.
	 */
	readonly cacheHit: boolean;
};

export type ArtifactCache = {
	/**
	 * Returns the cached directory, or invokes `build` once to populate it. Safe
	 * against concurrent callers in other processes.
	 */
	ensure(
		key: ArtifactKey,
		build: (directory: string, signal: AbortSignal) => Promise<void>,
		signal?: AbortSignal,
	): Promise<string>;

	/** Absolute cache root. */
	readonly root: string;
	/**
	 * Absolute directory holding every `lifetime: "run"` artifact of this run, or
	 * `null` when no run id was given. Removing it is the owner's job: the sweep
	 * has to work when a child crashed, which is exactly when something was left
	 * behind, so it cannot be driven by what the children report.
	 */
	readonly runRoot: string | null;
};

export type ArtifactCacheOptions = {
	/** Absolute, or relative to the current working directory. */
	readonly root: string;
	/** Enables `lifetime: "run"`. Supplied by the runner, never by the author. */
	readonly runId?: string;
	/** Observes every resolution, for reporting cache hits. */
	readonly onResolved?: (resolution: ArtifactResolution) => void;
	/**
	 * How long to wait for a concurrent builder before building anyway. Defaults
	 * to 30 000; `0` skips the lock entirely and always builds. Raise it above
	 * the slowest expected build to make a duplicated build rare; lowering it
	 * only trades waiting for rebuilding, never correctness.
	 */
	readonly lockWaitMs?: number;
};

/** Thrown when a `lifetime: "run"` artifact is requested outside a run. */
export class ArtifactRunScopeUnavailableError extends Error {
	readonly artifactName: string;

	constructor(artifactName: string) {
		super(
			`artifact "${artifactName}" requires lifetime "run", but the cache has no run id`,
		);
		this.name = "ArtifactRunScopeUnavailableError";
		this.artifactName = artifactName;
	}
}

const HASH_LENGTH = 20;
const DEFAULT_LOCK_WAIT_MS = 30_000;
const NEVER_ABORTED = new AbortController().signal;

/**
 * Best-effort: `true` means this caller holds the build lock, `false` means it
 * gave up waiting and should build unlocked rather than stall.
 *
 * Giving up is not a failure path. `FileLock` unlinks its file only from
 * `unlock()`, so a builder killed mid-build — a `SIGKILL`ed child, a crashed
 * compiler — leaves a lock nothing will ever remove. Waiting on it forever
 * would hang every later run; waiting for a bounded time and then duplicating
 * the work costs one wasted build.
 */
async function acquireBuildLock(
	lock: FileLock,
	lockWaitMs: number,
	signal: AbortSignal | undefined,
): Promise<boolean> {
	if (lockWaitMs <= 0) {
		return false;
	}

	const deadline = AbortSignal.timeout(lockWaitMs);

	try {
		await lock.lock(signal ? AbortSignal.any([signal, deadline]) : deadline);
		return true;
	} catch (error) {
		if (signal?.aborted) {
			throw error;
		}
		return false;
	}
}

/** Length-prefixed, so no concatenation of components can collide with another. */
function framed(part: string | Uint8Array): [Uint8Array, Uint8Array] {
	const bytes = typeof part === "string" ? encodeTextUtf8(part) : part;
	const header = new Uint8Array(4);
	setUint32Be(header, 0, bytes.length);
	return [header, bytes];
}

async function hashKey(
	key: ArtifactKey,
	runId: string | null,
): Promise<string> {
	const parts: Uint8Array[] = [];

	for (const component of [
		process.version,
		process.platform,
		process.arch,
		runId ?? "",
		...(key.scope ?? []),
		...key.inputs,
	]) {
		parts.push(...framed(component));
	}

	return (await sha256(concatBytes(parts))).toHex().slice(0, HASH_LENGTH);
}

/**
 * Cross-process cache for expensive setup output — a compiled reference
 * program, a generated corpus — keyed by a hash of everything the artifact
 * depends on rather than by an author-chosen id, so a stale artifact is
 * impossible rather than merely unlikely.
 *
 * Concurrency is settled in two layers, and only the second one is
 * load-bearing:
 *
 * 1. A `FileLock` beside the destination keeps concurrent callers from compiling
 *    the same thing at once. It is acquired best-effort with a `lockWaitMs`
 *    budget, so a lock left behind by a killed builder costs one wait and one
 *    duplicated build instead of hanging the run forever.
 * 2. The build goes to a temp directory and is `rename`d into place. Rename is
 *    atomic on POSIX and within a Windows volume, so however many callers
 *    build, exactly one artifact exists and every caller returns the same
 *    path.
 *
 * @example
 * 	Compile a reference program once, reuse it forever
 *
 * 	```ts
 * 	const cache = createArtifactCache({ root: "node_modules/.cache/my-tool" });
 * 	const source = await readFile("bench/reference.cpp", "utf8");
 *
 * 	const directory = await cache.ensure(
 * 	{ name: "reference C++", inputs: [source, "-O3"], scope: [compilerVersion] },
 * 	async (staging, signal) => {
 * 	await run("g++", ["-O3", "-o", join(staging, "reference"), sourcePath], {
 * 	signal,
 * 	});
 * 	},
 * 	);
 * 	const program = join(directory, "reference");
 * 	```
 *
 * 	Changing the source text or `-O3` changes the identity, so the next call
 * 	rebuilds; nothing has to remember to bump a version.
 *
 * @example
 * 	Scope an artifact to one run, and sweep it afterwards
 *
 * 	```ts
 * 	const cache = createArtifactCache({ root, runId, onResolved: (r) =>
 * 	report.data({ artifact: r.key.name, cacheHit: r.cacheHit }),
 * 	});
 *
 * 	await cache.ensure(
 * 	{ name: "corpus", inputs: [spec], lifetime: "run" },
 * 	generateCorpus,
 * 	);
 *
 * 	// The owner sweeps: a crashed child cannot be asked what it left behind.
 * 	await rm(cache.runRoot!, { recursive: true, force: true });
 * 	```
 *
 * @param options Root, run scoping, hit reporting and the lock budget. See
 *   {@link ArtifactCacheOptions}.
 */
export function createArtifactCache(
	options: ArtifactCacheOptions,
): ArtifactCache {
	const root = resolvePath(options.root);
	const runId = options.runId ?? null;
	const runRoot = runId === null ? null : join(root, `run-${runId}`);
	const onResolved = options.onResolved;
	const lockWaitMs = options.lockWaitMs ?? DEFAULT_LOCK_WAIT_MS;

	return {
		root,
		runRoot,

		async ensure(key, build, signal): Promise<string> {
			const lifetime = key.lifetime ?? "persistent";
			if (lifetime === "run" && runRoot === null) {
				throw new ArtifactRunScopeUnavailableError(key.name);
			}

			const parent = lifetime === "run" && runRoot ? runRoot : root;
			const digest = await hashKey(key, lifetime === "run" ? runId : null);
			const directory = join(
				parent,
				`${slugify(key.name, { fallback: "artifact" })}-${digest}`,
			);

			if (await isDirectoryAsync(directory)) {
				onResolved?.({ key, directory, cacheHit: true });
				return directory;
			}

			signal?.throwIfAborted();
			await mkdir(parent, { recursive: true });

			const lock = new FileLock(directory);
			const held = await acquireBuildLock(lock, lockWaitMs, signal);

			try {
				// Whoever held the lock may have finished while this call waited.
				if (await isDirectoryAsync(directory)) {
					onResolved?.({ key, directory, cacheHit: true });
					return directory;
				}

				// Staged inside the destination's own filesystem, so rename is atomic.
				const staging = await createTempDir(".building", parent);
				try {
					await build(staging, signal ?? NEVER_ABORTED);
					await rename(staging, directory);
				} catch (error) {
					await rm(staging, { recursive: true, force: true });

					// A concurrent winner already renamed its own staging directory into
					// place; its result is as valid as the one just discarded.
					if (await isDirectoryAsync(directory)) {
						onResolved?.({ key, directory, cacheHit: true });
						return directory;
					}
					throw error;
				}
			} finally {
				if (held) {
					await lock.unlock();
				}
			}

			onResolved?.({ key, directory, cacheHit: false });
			return directory;
		},
	};
}
