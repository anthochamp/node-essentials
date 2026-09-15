import { type ChildProcess, fork, type Serializable } from "node:child_process";

import { Callable } from "@ac-kit/core";

import {
	type ProcessOutputStream,
	SpawnedProcess,
	type SpawnedProcessEvents,
	type SpawnedProcessOptions,
} from "./spawned-process.js";
import type { ProcessStdio } from "./start-process.js";

export type ForkedProcessEvents = SpawnedProcessEvents & {
	/** A message the child sent over the IPC channel. */
	message: [message: unknown];
};

export type ForkProcessOptions = {
	readonly args?: readonly string[] | null;

	readonly cwd?: string | null;

	readonly env?: NodeJS.ProcessEnv | null;

	readonly execArgv?: readonly string[] | null;

	/** Default `"advanced"` — structured clone, so Uint8Array/BigInt survive. */
	readonly serialization?: "json" | "advanced" | null;

	/** Aborting terminates the child (SIGTERM, then SIGKILL after `graceMs`). */
	readonly signal?: AbortSignal | null;

	/**
	 * Default `"inherit"`, or `"pipe"` when `onOutput` is given. `output` events
	 * only ever carry a piped stream. IPC uses its own fd, so nothing the child
	 * prints can corrupt it.
	 */
	readonly stdout?: ProcessStdio | null;

	/** Default `"inherit"`, or `"pipe"` when `onOutput` is given. */
	readonly stderr?: ProcessStdio | null;

	/** Pre-subscribed before the child can write anything. */
	readonly onOutput?: Callable<
		[stream: ProcessOutputStream, line: string]
	> | null;

	/** Pre-subscribed before the child can send anything. */
	readonly onMessage?: Callable<[message: unknown]> | null;

	/** Default 5000. */
	readonly graceMs?: number | null;
};

/**
 * A forked Node module: everything a {@link SpawnedProcess} offers, plus the IPC
 * channel `fork` opens.
 */
export class ForkedProcess extends SpawnedProcess<ForkedProcessEvents> {
	constructor(
		child: ChildProcess,
		startedAt: number,
		options?: SpawnedProcessOptions,
	) {
		super(child, startedAt, options);

		// Eager, unlike `output`: an unread IPC channel drops what arrives on it.
		child.on("message", (message) => {
			this.dispatch("message", [message]);
		});
	}

	/**
	 * Sends a message to the child.
	 *
	 * @param message Anything the configured serialization can carry.
	 * @param signal Abandons the send.
	 * @returns A promise resolving once the message has been handed to the OS.
	 */
	send(message: Serializable, signal?: AbortSignal | null): Promise<void> {
		if (signal?.aborted === true) {
			return Promise.reject(signal.reason);
		}
		return new Promise((resolve, reject) => {
			const onAbort = () => reject(signal?.reason);
			signal?.addEventListener("abort", onAbort, { once: true });

			this.child.send(message, (error) => {
				signal?.removeEventListener("abort", onAbort);
				if (error) {
					reject(error);
					return;
				}
				resolve();
			});
		});
	}
}

/**
 * Forks a Node module with an IPC channel and resolves once it has spawned, so
 * the returned handle always has a `pid` and a live channel. A spawn failure
 * rejects here rather than surfacing later on the handle.
 *
 * @param modulePath The module to run as the child.
 * @param options Streams, environment, cancellation. See
 *   {@link ForkProcessOptions}.
 * @returns A handle over the running child.
 * @throws When the module cannot be forked.
 */
export async function forkProcess(
	modulePath: string,
	options?: ForkProcessOptions,
): Promise<ForkedProcess> {
	const startedAt = performance.now();
	const piped = options?.onOutput ? "pipe" : "inherit";

	const child = fork(modulePath, options?.args ? [...options.args] : [], {
		cwd: options?.cwd ?? undefined,
		env: options?.env ?? undefined,
		execArgv: options?.execArgv ? [...options.execArgv] : undefined,
		serialization: options?.serialization ?? "advanced",
		stdio: [
			"inherit",
			options?.stdout ?? piped,
			options?.stderr ?? piped,
			"ipc",
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

	const forked = new ForkedProcess(child, startedAt, {
		graceMs: options?.graceMs,
	});

	const onMessage = options?.onMessage;
	if (onMessage) {
		forked.subscribe("message", onMessage);
	}
	const onOutput = options?.onOutput;
	if (onOutput) {
		forked.subscribe("output", onOutput);
	}

	const signal = options?.signal;
	if (signal?.aborted === true) {
		void forked.terminate();
	} else {
		signal?.addEventListener("abort", () => void forked.terminate(), {
			once: true,
		});
	}

	return forked;
}
