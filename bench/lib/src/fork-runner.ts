import { fileURLToPath } from "node:url";

import {
	BENCH_PROTOCOL_VERSION,
	ChildMessage,
	DiscoveredCondition,
	MeasureData,
	parseChildMessage,
	ProtocolVersionMismatchError,
	StartMessage,
} from "@ac-bench/core/runner";
import { ISink, ReportDiagnostic, ReportScopeStatus } from "@ac-kit/app-report";
import { reportProcessOutput } from "@ac-kit/app-system";
import { formatError } from "@ac-kit/core";
import { ForkedProcess, forkProcess } from "@ac-kit/node";

import { IpcReportReceiver } from "./ipc-report-receiver.js";

/** No message from a child for this long means it is no longer making progress. */
export const DEFAULT_HEARTBEAT_TIMEOUT_MS = 30_000;

const HANDSHAKE_TIMEOUT_MS = 10_000;

/** A child stopped producing messages without having finished. */
export class ChildTimeoutError extends Error {
	constructor(readonly timeoutMs: number) {
		super(`child produced no message for ${timeoutMs}ms`);
		this.name = "ChildTimeoutError";
	}
}

/** A fork unit outlived its wall-clock budget. */
export class ConditionTimeoutError extends Error {
	constructor(readonly timeoutMs: number) {
		super(`condition exceeded its ${timeoutMs}ms budget`);
		this.name = "ConditionTimeoutError";
	}
}

/** A child exited before reporting that it was done. */
export class ChildExitedError extends Error {
	constructor(
		readonly code: number | null,
		readonly signal: NodeJS.Signals | null,
		options?: ErrorOptions,
	) {
		super(
			signal === null
				? `child exited with code ${code}`
				: `child was killed with ${signal}`,
			options,
		);
		this.name = "ChildExitedError";
	}
}

export type ForkOptions = {
	readonly runId: string;
	readonly artifactCacheRoot: string;
	readonly signal: AbortSignal;
	readonly heartbeatTimeoutMs?: number;
	/** Wall-clock cap on one fork unit. `0` (the default) disables it. */
	readonly conditionTimeoutMs?: number;
	/** Imported by the child before any bench file, in order. */
	readonly setupFiles?: readonly string[];
	readonly execArgv?: readonly string[];
	readonly env?: Readonly<Record<string, string>>;
	/** Called once the child exists, and again with `undefined` once it is gone. */
	readonly onChildPid?: (pid: number | undefined) => void;
};

export type ChildOutcome = {
	status: ReportScopeStatus;
	error: unknown;
};

/**
 * Forks a discovery child for `file` and returns the condition tree it
 * registered, without executing a single case.
 */
export async function discoverConditionsInFile(
	file: string,
	options: ForkOptions,
): Promise<DiscoveredCondition[]> {
	await using child = await spawnChild_(options);
	const messages = childMessages_(
		child,
		options.heartbeatTimeoutMs ?? DEFAULT_HEARTBEAT_TIMEOUT_MS,
	);

	await handshake_(child, messages, options);
	await child.send({ t: "list", file });

	for await (const raw of messages) {
		const message = parseChildMessage(raw);

		if (message.t === "conditions") {
			return message.conditions;
		}

		if (message.t === "fatal") {
			throw asError_(message.error);
		}
	}

	const exit = await child.waitForExit();
	throw new ChildExitedError(exit.code, exit.signal);
}

/**
 * Forks a child, runs one fork unit in it, and replays everything it reports
 * into `sink` in order.
 *
 * The child's own scopes are closed out here if it dies without saying it was
 * done, so a crash can never strand a scope.
 */
export async function runForkUnitInChild(
	start: Omit<StartMessage, "t">,
	sink: ISink<MeasureData>,
	onDiagnostic: (diagnostic: ReportDiagnostic) => void,
	options: ForkOptions,
): Promise<ChildOutcome> {
	const receiver = new IpcReportReceiver({
		sink,
		send: (message) => child.send(message),
		onDiagnostic,
		onProtocolFailure: () => {
			void child.terminate();
		},
	});

	let outputDrained: Promise<void> = Promise.resolve();
	// Declared before `child` so it is disposed after it, once output has ended.
	await using _outputFlush = {
		[Symbol.asyncDispose]: () => outputDrained,
	};

	await using child = await spawnChild_(options);

	outputDrained = reportProcessOutput(child, {
		// Output belongs to whatever the child currently has open rather than to
		// the fork unit's ancestor.
		write: (event) =>
			sink.write(
				event.kind === "output"
					? {
							...event,
							scopeId: receiver.deepestOpenScope ?? start.parentScopeId,
						}
					: event,
			),
		flush: () => {},
		close: () => {},
	});

	const messages = childMessages_(
		child,
		options.heartbeatTimeoutMs ?? DEFAULT_HEARTBEAT_TIMEOUT_MS,
	);

	const deadline = conditionDeadline_(options.conditionTimeoutMs);

	try {
		await handshake_(child, messages, options);
		await child.send({ t: "start", ...start });

		for await (const raw of messages) {
			await receiver.receive(raw);

			if (receiver.status !== null || receiver.fatal !== null) {
				break;
			}

			if (deadline !== null && Date.now() > deadline) {
				throw new ConditionTimeoutError(options.conditionTimeoutMs ?? 0);
			}
		}
	} catch (error) {
		// A channel that breaks on the way out cannot retroactively invalidate a run
		// the child already reported as finished.
		if (receiver.fatal === null && receiver.status !== null) {
			onDiagnostic({
				severity: "warning",
				code: "transport-after-done",
				message: `the channel failed after the child reported it was done: ${formatError(error)}`,
			});

			return { status: receiver.status, error: null };
		}

		// Ask first, then escalate: `terminate()` is SIGTERM, then SIGKILL.
		await abortChild_(child, error);

		const explained = await explainWithExit_(child, error);
		await receiver.closeOpenScopes(explained);

		return { status: "failed", error: explained };
	}

	if (receiver.fatal !== null) {
		const error = asError_(receiver.fatal);
		await receiver.closeOpenScopes(error);

		return { status: "failed", error };
	}

	if (receiver.status === null) {
		const exit = await child.waitForExit();
		const error = new ChildExitedError(exit.code, exit.signal);
		await receiver.closeOpenScopes(error);

		return { status: "failed", error };
	}

	return { status: receiver.status, error: null };
}

function childEntryPath_(): string {
	return fileURLToPath(import.meta.resolve("@ac-bench/lib/child"));
}

async function spawnChild_(options: ForkOptions): Promise<ForkedProcess> {
	const child = await forkProcess(childEntryPath_(), {
		serialization: "advanced",
		signal: options.signal,
		execArgv: [
			"--import",
			import.meta.resolve("tsx/esm"),
			...(options.execArgv ?? []),
		],
		env: { ...process.env, ...options.env },
		stdout: "pipe",
		stderr: "pipe",
	});

	options.onChildPid?.(child.pid);

	return child;
}

async function handshake_(
	child: ForkedProcess,
	messages: AsyncGenerator<unknown>,
	options: ForkOptions,
): Promise<void> {
	await child.send({
		t: "hello",
		version: BENCH_PROTOCOL_VERSION,
		runId: options.runId,
		artifactCacheRoot: options.artifactCacheRoot,
		...(options.setupFiles ? { setupFiles: [...options.setupFiles] } : {}),
	});

	const first = await withTimeout_(messages.next(), HANDSHAKE_TIMEOUT_MS);

	if (first.done === true) {
		const exit = await child.waitForExit();
		throw new ChildExitedError(exit.code, exit.signal);
	}

	const message: ChildMessage = parseChildMessage(first.value);

	if (message.t !== "hello") {
		throw new ProtocolVersionMismatchError(BENCH_PROTOCOL_VERSION, -1);
	}

	if (message.version !== BENCH_PROTOCOL_VERSION) {
		throw new ProtocolVersionMismatchError(
			BENCH_PROTOCOL_VERSION,
			message.version,
		);
	}
}

/**
 * Every message the child sends, in order, ending when it exits.
 *
 * @throws {ChildTimeoutError} When nothing arrives for `timeoutMs`.
 */
async function* childMessages_(
	child: ForkedProcess,
	timeoutMs: number,
): AsyncGenerator<unknown> {
	const pending: unknown[] = [];
	let notify: (() => void) | null = null;
	let exited = false;

	const unsubscribe = child.subscribe("message", (message: unknown) => {
		pending.push(message);
		notify?.();
	});

	async function watchExit(): Promise<void> {
		await child.waitForExit();
		exited = true;
		notify?.();
	}

	void watchExit();

	try {
		for (;;) {
			while (pending.length > 0) {
				yield pending.shift();
			}

			if (exited) {
				return;
			}

			const { promise, resolve } = Promise.withResolvers<void>();
			notify = resolve;

			const timer = setTimeout(resolve, timeoutMs);
			await promise;
			clearTimeout(timer);
			notify = null;

			if (pending.length === 0 && !exited) {
				throw new ChildTimeoutError(timeoutMs);
			}
		}
	} finally {
		unsubscribe?.();
	}
}

async function withTimeout_<T>(
	promise: Promise<T>,
	timeoutMs: number,
): Promise<T> {
	const { promise: timedOut, reject } = Promise.withResolvers<never>();
	const timer = setTimeout(
		() => reject(new ChildTimeoutError(timeoutMs)),
		timeoutMs,
	);

	try {
		return await Promise.race([promise, timedOut]);
	} finally {
		clearTimeout(timer);
	}
}

function asError_(value: unknown): Error {
	return value instanceof Error
		? value
		: new Error(typeof value === "string" ? value : JSON.stringify(value));
}

function conditionDeadline_(timeoutMs: number | undefined): number | null {
	return timeoutMs === undefined || timeoutMs <= 0
		? null
		: Date.now() + timeoutMs;
}

/**
 * First rung of the escalation ladder: the child is told to stop, and only then
 * signalled. A child that honours it closes its own scopes.
 */
async function abortChild_(
	child: ForkedProcess,
	reason: unknown,
): Promise<void> {
	try {
		await child.send({ t: "abort", reason: formatError(reason) });
	} catch {
		// The channel is already gone; the signal below is what is left.
	}

	await child.terminate();
}

/**
 * A broken channel names the symptom (`write EPIPE`); the child's exit status
 * names the cause. The verdicts the parent reaches on its own already explain
 * themselves, and the child died because of them rather than the other way
 * round.
 */
async function explainWithExit_(
	child: ForkedProcess,
	error: unknown,
): Promise<unknown> {
	if (
		error instanceof ChildExitedError ||
		error instanceof ChildTimeoutError ||
		error instanceof ConditionTimeoutError ||
		error instanceof ProtocolVersionMismatchError
	) {
		return error;
	}

	const exit = await child.waitForExit();

	return new ChildExitedError(exit.code, exit.signal, { cause: error });
}
