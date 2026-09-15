import { spawn } from "node:child_process";

import { Callable } from "@ac-kit/core";

import { type ProcessOutputStream, SpawnedProcess } from "./spawned-process.js";

/** What the child does with one of its standard streams. */
export type ProcessStdio = "pipe" | "inherit" | "ignore";

export type StartProcessOptions = {
	/**
	 * Runs the command through a shell, so redirection and piping work and
	 * arguments are **not** escaped. Only ever pass a trusted command line.
	 */
	readonly shell?: boolean | string | null;

	readonly cwd?: string | null;

	readonly env?: NodeJS.ProcessEnv | null;

	/** Aborting terminates the child. */
	readonly signal?: AbortSignal | null;

	/** Written to the child's stdin, which is then closed. */
	readonly input?: string | Uint8Array | null;

	/** Default `"pipe"`, which is what `output` events are read from. */
	readonly stdout?: ProcessStdio | null;

	/** Default `"pipe"`. */
	readonly stderr?: ProcessStdio | null;

	/**
	 * Makes the child lead its own process group, so `terminate`, `kill` and an
	 * aborted signal reach everything it spawns rather than the child alone.
	 */
	readonly detached?: boolean | null;

	/** Pre-subscribed before the child can write anything. */
	readonly onOutput?: Callable<
		[stream: ProcessOutputStream, line: string]
	> | null;

	/** Grace period before `terminate` escalates to `SIGKILL`. Default 5000. */
	readonly graceMs?: number | null;
};

/**
 * Spawns a command and resolves once it is running.
 *
 * Nothing in `args` can be interpreted as a command unless `shell` is set, so
 * the default form is safe with untrusted arguments.
 *
 * @example
 * 	```ts
 * 	await using child = await startProcess("tail", ["-f", "app.log"]);
 * 	child.subscribe("output", (_stream, line) => console.log(line));
 * 	```;
 *
 * @param command The executable to run.
 * @param args Arguments passed to it verbatim.
 * @param options Streams, environment, cancellation. See
 *   {@link StartProcessOptions}.
 * @returns A handle over the running child.
 * @throws When the command cannot be spawned.
 */
export async function startProcess(
	command: string,
	args?: readonly string[],
	options?: StartProcessOptions,
): Promise<SpawnedProcess> {
	const startedAt = performance.now();

	const child = spawn(command, args ? [...args] : [], {
		shell: options?.shell ?? false,
		cwd: options?.cwd ?? undefined,
		env: options?.env ?? undefined,
		detached: options?.detached ?? false,
		stdio: [
			options?.input !== undefined && options?.input !== null
				? "pipe"
				: "ignore",
			options?.stdout ?? "pipe",
			options?.stderr ?? "pipe",
		],
	});

	// Attached before anything can await: an abort signal fires 'error' on the
	// next tick, which would go unhandled during the gap below.
	child.on("error", () => {});

	await new Promise<void>((resolve, reject) => {
		child.once("error", reject);
		child.once("spawn", () => {
			child.removeListener("error", reject);
			resolve();
		});
	});

	const spawned = new SpawnedProcess(child, startedAt, {
		graceMs: options?.graceMs,
		detached: options?.detached,
	});

	const onOutput = options?.onOutput;
	if (onOutput) {
		spawned.subscribe("output", onOutput);
	}

	if (options?.input) {
		// A child that never reads stdin makes this write emit its own error.
		child.stdin?.on("error", () => {});
		child.stdin?.end(options.input);
	}

	// Wired here rather than handed to `spawn`, whose own handling signals the
	// child alone and never escalates.
	const signal = options?.signal;
	if (signal?.aborted === true) {
		void spawned.terminate();
	} else {
		signal?.addEventListener("abort", () => void spawned.terminate(), {
			once: true,
		});
	}

	return spawned;
}
