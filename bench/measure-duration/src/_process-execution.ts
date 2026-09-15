import { type SpawnedProcess, startProcess } from "@ac-kit/node";
import * as z from "zod/mini";

/** Grace given to a `SIGTERM` before the group is killed outright. */
const TERMINATE_GRACE_MS_ = 2_000;

/** Bytes of stderr retained per iteration for failure diagnostics. */
const STDERR_TAIL_BYTES_ = 4_096;

/**
 * Wall-clock breakdown of one cold start, reported by the spawned process.
 *
 * A total plus an exit code is enough to compare two cold starts but not to say
 * where the time went, which is the only actionable part of a slow one.
 */
export const coldStartPhasesSchema = z.object({
	/**
	 * Interpreter start-up, before any user code: `bootstrapComplete -
	 * nodeStart`.
	 */
	startupMs: z.number(),
	/** Importing the bench file and everything it pulls in. */
	importMs: z.number(),
	/** The case body's single call. */
	runMs: z.number(),
});
export type ColdStartPhases = z.infer<typeof coldStartPhasesSchema>;

export type IterationOutcome = {
	readonly wallMs: number;
	readonly exitCode: number | null;
	readonly terminatedBy: string | null;
	/** Last {@link STDERR_TAIL_BYTES_} bytes of stderr, empty when it wrote none. */
	readonly stderrTail: string;
	/** `null` unless phases were requested and the process reported them. */
	readonly phases: ColdStartPhases | null;
};

export type SpawnIterationOptions = {
	readonly cwd?: string;
	readonly env?: Readonly<Record<string, string>>;
	/** Reads one JSON line of {@link ColdStartPhases} from stdout. */
	readonly capturePhases?: boolean;
};

/**
 * Owns every process spawned for a case, and guarantees none outlives it.
 *
 * Killing a process does not kill its children on POSIX: a hung grandchild is
 * reparented to init and survives the whole run, holding a port or a lock, with
 * nothing left pointing at it. Each iteration is therefore started `detached`,
 * which makes `terminate`/`kill` address its whole process group.
 */
export class ProcessGroup {
	private readonly live = new Set<SpawnedProcess>();
	private readonly onProcessExit = () => {
		for (const child of this.live) {
			child.kill("SIGKILL");
		}
	};

	private disposed = false;

	constructor() {
		// Last resort: the owning process is going away and async teardown will
		// never get a turn.
		process.on("exit", this.onProcessExit);
	}

	/**
	 * Spawns one iteration and resolves when it has exited.
	 *
	 * @param command Executable, resolved on `PATH`. Never passed through a
	 *   shell.
	 * @param args Arguments, passed as a vector rather than a command line.
	 * @param options Working directory, environment and phase capture.
	 * @param signal Aborting tears the whole group down.
	 * @returns What the process cost and how it ended.
	 * @throws {Error} If the executable cannot be started at all.
	 */
	async run(
		command: string,
		args: readonly string[],
		options: SpawnIterationOptions,
		signal: AbortSignal,
	): Promise<IterationOutcome> {
		signal.throwIfAborted();

		const child = await startProcess(command, args, {
			// Group leader, so teardown reaches whatever the iteration spawned.
			detached: process.platform !== "win32",
			stdout: options.capturePhases === true ? "pipe" : "ignore",
			stderr: "pipe",
			cwd: options.cwd,
			env: options.env === undefined ? undefined : { ...options.env },
			graceMs: TERMINATE_GRACE_MS_,
		});

		this.live.add(child);

		const stderr = collectTail_(child.stderr);
		const stdout =
			options.capturePhases === true ? collectTail_(child.stdout) : null;

		// Straight to `SIGKILL`: an aborted run is not waiting out a grace period.
		const onAbort = () => {
			child.kill("SIGKILL");
		};
		signal.addEventListener("abort", onAbort, { once: true });

		try {
			const exit = await child.waitForExit();

			return {
				wallMs: exit.durationMs,
				exitCode: exit.code,
				terminatedBy: exit.signal,
				stderrTail: await stderr,
				phases: stdout === null ? null : parsePhases_(await stdout),
			};
		} finally {
			signal.removeEventListener("abort", onAbort);
			this.live.delete(child);
		}
	}

	/**
	 * Terminates every process still running, escalating only if it has to.
	 *
	 * @returns Once the group is gone, or once it has been killed outright for
	 *   failing to leave within the grace period.
	 */
	async dispose(): Promise<void> {
		if (this.disposed) {
			return;
		}

		this.disposed = true;
		process.off("exit", this.onProcessExit);

		await Promise.all(
			[...this.live].map((child) => child.terminate(TERMINATE_GRACE_MS_)),
		);
	}
}

/**
 * Drains a stream to its end, keeping only the tail.
 *
 * Draining is not optional: an unread pipe fills and blocks the writer, which
 * would show up as a mysteriously slow iteration rather than as a deadlock.
 */
async function collectTail_(
	stream: ReadableStream<Uint8Array> | null,
): Promise<string> {
	if (stream === null) {
		return "";
	}

	const chunks: Buffer[] = [];
	let size = 0;

	for await (const chunk of stream) {
		const buffer = Buffer.from(chunk);

		chunks.push(buffer);
		size += buffer.length;

		while (
			chunks.length > 1 &&
			size - (chunks[0]?.length ?? 0) >= STDERR_TAIL_BYTES_
		) {
			size -= chunks.shift()?.length ?? 0;
		}
	}

	return Buffer.concat(chunks).subarray(-STDERR_TAIL_BYTES_).toString("utf8");
}

/** @returns The reported phases, or `null` when the process reported none. */
function parsePhases_(stdout: string): ColdStartPhases | null {
	const line = stdout.trimEnd().split("\n").at(-1);

	if (line === undefined || line === "") {
		return null;
	}

	try {
		return coldStartPhasesSchema.parse(JSON.parse(line));
	} catch {
		// A case that writes its own output to stdout is not an error.
		return null;
	}
}
