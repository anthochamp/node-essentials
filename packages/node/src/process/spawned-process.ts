import type { ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";

import {
	EventDispatcherMapBase,
	type EventDispatcherSubscribeOptions,
	type EventDispatcherWaitOptions,
	type IEventDispatcherMap,
} from "@ac-kit/async";
import { type Callable, Timer } from "@ac-kit/core";

export type ProcessOutputStream = "stdout" | "stderr";

export type ProcessExit = {
	code: number | null;
	signal: NodeJS.Signals | null;
	durationMs: number;
};

export type SpawnedProcessEvents = {
	/** One line of the child's output, with its terminator stripped. */
	output: [stream: ProcessOutputStream, line: string];
};

/** Time a terminated child gets to exit before it is killed outright. */
export const DEFAULT_PROCESS_GRACE_MS = 5000;

export type SpawnedProcessOptions = {
	/** Grace period before {@link SpawnedProcess.terminate} escalates. */
	readonly graceMs?: number | null;

	/**
	 * The child leads its own process group, so signals address the group rather
	 * than the child alone.
	 */
	readonly detached?: boolean | null;
};

/**
 * A running child process: its output as events, its exit as an awaitable, and
 * a two-stage termination.
 *
 * Obtained from `startProcess` or `forkProcess`, both of which resolve only
 * once the child has actually spawned — so a handle always has a `pid`, and a
 * spawn failure surfaces as a rejection there rather than later on the handle.
 *
 * Line splitting is attached on the first `output` subscription, so a caller
 * that only wants the exit status never pays for it.
 */
export class SpawnedProcess<
	TEvents extends SpawnedProcessEvents & Record<PropertyKey, unknown[]> =
		SpawnedProcessEvents,
>
	extends EventDispatcherMapBase<TEvents>
	implements IEventDispatcherMap<TEvents>, AsyncDisposable
{
	private readonly exited: Promise<ProcessExit>;
	private readonly outputDrained: Promise<void>[] = [];
	private outputAttached = false;
	private webStdout: ReadableStream<Uint8Array> | null = null;
	private webStderr: ReadableStream<Uint8Array> | null = null;
	private terminating: Promise<ProcessExit> | null = null;
	private killTimer: Timer | null = null;
	private readonly graceMs: number;
	private readonly detached: boolean;

	constructor(
		protected readonly child: ChildProcess,
		private readonly startedAt: number,
		options?: SpawnedProcessOptions,
	) {
		super();

		this.graceMs = options?.graceMs ?? DEFAULT_PROCESS_GRACE_MS;
		this.detached = options?.detached ?? false;

		// Post-spawn errors (a failed kill, a broken channel) must not become an
		// unhandled 'error'; `close` still fires and settles the exit.
		child.on("error", () => {});

		this.exited = this.waitForClose();
	}

	get pid(): number | undefined {
		return this.child.pid;
	}

	/** The child's standard output, `null` unless it was piped. */
	get stdout(): ReadableStream<Uint8Array> | null {
		this.webStdout ??= this.toWebStream(this.child.stdout);
		return this.webStdout;
	}

	/** The child's standard error, `null` unless it was piped. */
	get stderr(): ReadableStream<Uint8Array> | null {
		this.webStderr ??= this.toWebStream(this.child.stderr);
		return this.webStderr;
	}

	/** @internal Node stream behind {@link stdout}, for in-package buffering. */
	get nodeStdout_(): Readable | null {
		return this.child.stdout;
	}

	/** @internal Node stream behind {@link stderr}, for in-package buffering. */
	get nodeStderr_(): Readable | null {
		return this.child.stderr;
	}

	override subscribe<K extends keyof TEvents>(
		event: K,
		listener: Callable<TEvents[K]>,
		options?: EventDispatcherSubscribeOptions,
	): Callable | null {
		this.attachOutputFor(event);
		return super.subscribe(event, listener, options);
	}

	override wait<K extends keyof TEvents>(
		event: K,
		options?: EventDispatcherWaitOptions<TEvents[K]>,
	): Promise<TEvents[K]> {
		this.attachOutputFor(event);
		return super.wait(event, options);
	}

	/**
	 * Resolves once the child has exited, immediately if it already has.
	 *
	 * @param signal Abandons the wait; the child is left running.
	 * @returns The exit code, terminating signal and wall-clock duration.
	 */
	waitForExit(signal?: AbortSignal | null): Promise<ProcessExit> {
		if (!signal) {
			return this.exited;
		}
		// Rejects rather than throws: the signature promises a promise.
		if (signal.aborted) {
			return Promise.reject(signal.reason);
		}
		return new Promise<ProcessExit>((resolve, reject) => {
			const onAbort = () => reject(signal.reason);
			signal.addEventListener("abort", onAbort, { once: true });

			void this.exited.then((exit) => {
				signal.removeEventListener("abort", onAbort);
				resolve(exit);
			});
		});
	}

	/**
	 * Sends `SIGTERM`, then `SIGKILL` if the child is still alive after
	 * `graceMs`. Idempotent: concurrent and repeated calls share one escalation.
	 *
	 * @param graceMs Overrides the grace period given at spawn time.
	 * @returns The child's exit, once it has happened.
	 */
	terminate(graceMs?: number): Promise<ProcessExit> {
		if (this.terminating) {
			return this.terminating;
		}
		this.terminating = this.exited;

		if (this.child.exitCode === null && this.child.signalCode === null) {
			this.signalProcess("SIGTERM");
			this.killTimer = new Timer(
				() => this.signalProcess("SIGKILL"),
				graceMs ?? this.graceMs,
			);
			this.killTimer.start();
		}

		return this.terminating;
	}

	/**
	 * Sends one signal and returns, with no escalation — for signals that mean
	 * something to the child other than "shut down".
	 *
	 * @param signal Defaults to `SIGTERM`.
	 * @returns Whether the signal was delivered.
	 */
	kill(signal: NodeJS.Signals = "SIGTERM"): boolean {
		return this.signalProcess(signal);
	}

	async [Symbol.asyncDispose](): Promise<void> {
		await this.terminate();
	}

	/**
	 * A detached child leads its own group, so the negated pid reaches whatever
	 * it spawned too — otherwise a grandchild outlives the run, reparented to
	 * init with nothing left pointing at it.
	 */
	private signalProcess(signal: NodeJS.Signals): boolean {
		const pid = this.child.pid;
		if (
			pid === undefined ||
			this.child.exitCode !== null ||
			this.child.signalCode !== null
		) {
			return false;
		}

		// Windows has no process groups; `detached` only opens a console there.
		if (!this.detached || process.platform === "win32") {
			return this.child.kill(signal);
		}

		try {
			process.kill(-pid, signal);
			return true;
		} catch {
			// Already gone between the liveness check and the signal.
			return false;
		}
	}

	protected attachOutput(): void {
		if (this.outputAttached) {
			return;
		}
		this.outputAttached = true;

		this.pipeOutput("stdout", this.child.stdout);
		this.pipeOutput("stderr", this.child.stderr);
	}

	/**
	 * Adapts by listening rather than by `Readable.toWeb`, which would lock the
	 * source: every consumer here is one more `data` listener on the same stream.
	 * No backpressure — the child's output is drained as fast as it arrives.
	 */
	private toWebStream(
		source: Readable | null,
	): ReadableStream<Uint8Array> | null {
		if (!source) {
			return null;
		}

		let live = true;
		let onData: ((chunk: Buffer) => void) | null = null;

		return new ReadableStream<Uint8Array>({
			start(controller) {
				onData = (chunk) => {
					if (live) {
						controller.enqueue(chunk);
					}
				};
				source.on("data", onData);
				source.once("end", () => {
					if (live) {
						live = false;
						controller.close();
					}
				});
				source.once("error", (error) => {
					if (live) {
						live = false;
						controller.error(error);
					}
				});
			},
			cancel() {
				live = false;
				if (onData) {
					source.off("data", onData);
					onData = null;
				}
			},
		});
	}

	private attachOutputFor(event: PropertyKey): void {
		if (event === "output") {
			this.attachOutput();
		}
	}

	private pipeOutput(
		stream: ProcessOutputStream,
		source: Readable | null,
	): void {
		if (!source) {
			return;
		}

		const lines = createInterface({ input: source });
		lines.on("line", (line) => {
			this.dispatch("output", [stream, line] as TEvents["output"]);
		});
		// `close` on the child can beat readline's final line out of the door.
		this.outputDrained.push(
			new Promise<void>((resolve) => lines.once("close", () => resolve())),
		);
	}

	private async waitForClose(): Promise<ProcessExit> {
		const [code, signal] = await new Promise<
			[number | null, NodeJS.Signals | null]
		>((resolve) => {
			this.child.once("close", (closeCode, closeSignal) =>
				resolve([closeCode, closeSignal]),
			);
		});

		if (this.killTimer) {
			this.killTimer.cancel();
			this.killTimer = null;
		}

		await Promise.allSettled(this.outputDrained);

		return { code, signal, durationMs: Date.now() - this.startedAt };
	}
}
