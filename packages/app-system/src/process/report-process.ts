import {
	ATTR_PROCESS_COMMAND,
	ATTR_PROCESS_CWD,
	ATTR_PROCESS_EXIT_CODE,
	ATTR_PROCESS_SIGNAL,
	type ISink,
	type ReportScopeId,
	type ReportScopeStatus,
} from "@ac-kit/app-report";
import {
	ProcessExitError,
	type ProcessResult,
	type SpawnProcessOptions,
	type SpawnedProcess,
	spawnProcess,
} from "@ac-kit/node";

export type SpawnReportedProcessOptions = SpawnProcessOptions & {
	/** Receives the scope, the output lines and the outcome. */
	readonly sink: ISink<never>;

	/** Nests the process scope under an open one. */
	readonly parentScopeId?: ReportScopeId | null;

	/** Scope title. Defaults to the command. */
	readonly title?: string | null;

	/** Scope key. Defaults to the command. */
	readonly key?: string | null;
};

/**
 * Streams a running child's output into a sink, one `output` event per line.
 *
 * @param child The handle to read from; its stream must have been piped.
 * @param sink The destination.
 * @param scopeId Attributes the events to an already-open scope.
 * @returns A promise resolving once the child has exited and every event has
 *   been written.
 */
export async function reportProcessOutput(
	child: SpawnedProcess,
	sink: ISink<never>,
	scopeId: ReportScopeId | null = null,
): Promise<void> {
	const written: Promise<void>[] = [];

	// Subscribes before the first await, so no line can slip past.
	child.subscribe("output", (stream, line) => {
		// A synchronous sink returns nothing and needs no bookkeeping.
		const pending = sink.write({
			kind: "output",
			timestamp: Date.now(),
			scopeId,
			stream,
			chunk: line,
		});
		if (pending) {
			written.push(pending);
		}
	});

	await child.waitForExit();
	await Promise.all(written);
}

function exitAttributes_(
	result: ProcessResult | null,
	failure: unknown,
): { code: number | null; signal: NodeJS.Signals | null } {
	if (result) {
		return { code: result.code, signal: result.signal };
	}
	if (failure instanceof ProcessExitError) {
		return {
			code: typeof failure.code === "number" ? failure.code : null,
			signal: failure.signal,
		};
	}
	return { code: null, signal: null };
}

/**
 * Runs a command as a reported scope: a `scope-start`/`scope-end` pair carrying
 * the command, working directory, exit code and signal, wrapping one `output`
 * event per line the child printed.
 *
 * @param command The executable to run.
 * @param args Arguments passed to it verbatim.
 * @param options The sink and scope identity, plus everything
 *   {@link SpawnProcessOptions} accepts.
 * @returns The exit status and the captured streams.
 * @throws Whatever `spawnProcess` throws, after the scope has been closed.
 */
export async function spawnReportedProcess(
	command: string,
	args: readonly string[] | undefined,
	options: SpawnReportedProcessOptions,
): Promise<ProcessResult> {
	const { sink, parentScopeId, title, key, ...spawnOptions } = options;
	const startedAt = Date.now();
	const cwd = options.cwd ?? process.cwd();
	const scopeId = globalThis.crypto.randomUUID();

	await sink.write({
		kind: "scope-start",
		timestamp: startedAt,
		scopeId,
		parentId: parentScopeId ?? null,
		title: title ?? command,
		key: key ?? command,
		attributes: { [ATTR_PROCESS_COMMAND]: command, [ATTR_PROCESS_CWD]: cwd },
	});

	const written: Promise<void>[] = [];
	let result: ProcessResult | null = null;
	let failure: unknown = null;

	try {
		result = await spawnProcess(command, args, {
			...spawnOptions,
			onOutput: (stream, line) => {
				const pending = sink.write({
					kind: "output",
					timestamp: Date.now(),
					scopeId,
					stream,
					chunk: line,
				});
				if (pending) {
					written.push(pending);
				}
			},
		});
	} catch (error) {
		failure = error;
	}

	await Promise.all(written);

	const exit = exitAttributes_(result, failure);
	const durationMs = Date.now() - startedAt;
	const status: ReportScopeStatus = options.signal?.aborted
		? "cancelled"
		: failure !== null || exit.code !== 0
			? "failed"
			: "ok";

	await sink.write({
		kind: "scope-end",
		timestamp: startedAt + durationMs,
		scopeId,
		status,
		durationMs,
		...(status === "failed" && failure instanceof Error
			? { error: failure }
			: {}),
		attributes: {
			[ATTR_PROCESS_COMMAND]: command,
			[ATTR_PROCESS_CWD]: cwd,
			[ATTR_PROCESS_EXIT_CODE]: exit.code,
			[ATTR_PROCESS_SIGNAL]: exit.signal,
		},
	});

	if (failure !== null) {
		throw failure;
	}
	return result as ProcessResult;
}
