import { Attributes } from "../attributes.js";
import {
	ReportDiagnostic,
	ReportEvent,
	ReportScopeId,
	ReportScopeStatus,
} from "../events.js";
import { ReportEventPayload, withEnvelope } from "../helpers/with-envelope.js";
import type { ISink } from "../sink.js";

/** Writes through an arbitrary destination — a queue, a core, a transport. */
export type ScopeWriter<TData> = (
	event: ReportEvent<TData>,
) => Promise<void> | void;

export type ScopeSessionOptions<TData> = {
	/** Stable across runs. Defaults to `title`. */
	readonly key?: string;

	/** Declared unit count, when known up front. */
	readonly total?: number;

	readonly attributes?: Attributes;

	/**
	 * When aborted at disposal time and neither `fail()` nor `skip()` was called,
	 * the scope resolves as `"cancelled"` instead of `"ok"`.
	 */
	readonly signal?: AbortSignal | null;

	/** Default `Date.now`. */
	readonly clock?: () => number;

	/**
	 * Called for every failed write. When omitted, failures accumulate and are
	 * thrown from disposal as an `AggregateError` — never silently dropped.
	 */
	readonly onWriteError?: (error: unknown, event: ReportEvent<TData>) => void;
};

export type ScopeSession<TData> = AsyncDisposable & {
	readonly id: ReportScopeId;

	/**
	 * Resolves once `scope-start` has been accepted by the writer, for a caller
	 * that needs acknowledgement. Rejects with the write failure.
	 */
	readonly started: Promise<void>;

	/**
	 * The primitive every helper below is one call to. Stamps `timestamp` and
	 * `scopeId`, appends to the ordering chain, and returns immediately.
	 */
	write(payload: ReportEventPayload<TData>): void;

	progress(completed: number, total?: number, message?: string): void;
	heartbeat(elapsedMs?: number, message?: string): void;
	diagnostic(diagnostic: ReportDiagnostic): void;
	data(data: TData): void;
	attach(body: string | Uint8Array, mediaType: string, name?: string): void;
	output(stream: "stdout" | "stderr", chunk: string): void;
	attributes(attributes: Attributes): void;

	/** A nested scope sharing this session's writer and ordering chain. */
	child(
		title: string,
		options?: ScopeSessionOptions<TData>,
	): ScopeSession<TData>;

	fail(error?: unknown): void;
	skip(): void;
};

/**
 * The ordering primitive shared by a session and every scope nested under it.
 *
 * `idle` tracks whether the previous write already settled _synchronously_ (a
 * `ScopeWriter` returning `void`, not a pending `Promise`): as long as every
 * write keeps returning synchronously, each new one dispatches immediately too,
 * matching a synchronous sink's own call-order guarantee. Only once a write
 * returns a real pending `Promise` does a later write have to wait for it, to
 * preserve ordering against a slow/async destination.
 */
type WriteChain = { tail: Promise<void>; idle: boolean };

/**
 * Dispatches `write(event)` on `chain`, synchronously when nothing is in
 * flight.
 */
function dispatchOnChain<TData>(
	chain: WriteChain,
	write: ScopeWriter<TData>,
	event: ReportEvent<TData>,
): Promise<void> {
	function dispatch(): Promise<void> {
		let outcome: Promise<void> | void;
		try {
			outcome = write(event);
		} catch (error) {
			chain.idle = true;
			return Promise.reject(error);
		}

		if (outcome === undefined) {
			// A synchronous sink already applied its side effect; stay idle so a
			// write issued later in the same tick can still dispatch immediately.
			chain.idle = true;
			return Promise.resolve();
		}

		chain.idle = false;
		const settled = Promise.resolve(outcome);
		const markIdleIfLatest = () => {
			if (chain.tail === result) {
				chain.idle = true;
			}
		};
		settled.then(markIdleIfLatest, markIdleIfLatest);
		return settled;
	}

	const result: Promise<void> = chain.idle
		? dispatch()
		: chain.tail.then(dispatch);
	chain.tail = result;
	return result;
}

function createSession<TData>(
	write: ScopeWriter<TData>,
	chain: WriteChain,
	parentScopeId: ReportScopeId | null,
	title: string,
	options: ScopeSessionOptions<TData> | undefined,
): ScopeSession<TData> {
	const id = globalThis.crypto.randomUUID();
	const clock = options?.clock ?? Date.now;
	const startedAt = clock();
	let status: "failed" | "skipped" | null = null;
	let capturedError: unknown;
	let disposed = false;
	const writeErrors: unknown[] = [];

	function handleWriteError(error: unknown, event: ReportEvent<TData>): void {
		if (options?.onWriteError) {
			options.onWriteError(error, event);
		} else {
			writeErrors.push(error);
		}
	}

	/** Chains `event` onto the shared ordering tail; never rejects. */
	function enqueue(event: ReportEvent<TData>): Promise<void> {
		return dispatchOnChain(chain, write, event).catch((error: unknown) => {
			handleWriteError(error, event);
		});
	}

	const scopeStartEvent: ReportEvent<TData> = {
		kind: "scope-start",
		timestamp: startedAt,
		scopeId: id,
		parentId: parentScopeId,
		title,
		key: options?.key ?? title,
		...(options?.total !== undefined ? { total: options.total } : {}),
		...(options?.attributes && Object.keys(options.attributes).length > 0
			? { attributes: options.attributes }
			: {}),
	};

	// Kept separate from `enqueue` (which never rejects) because `started` must
	// still reject for a caller that awaits it; attaching a handler here also
	// marks it "handled", so an ignored `started` never crashes the process.
	const started = dispatchOnChain(chain, write, scopeStartEvent);
	started.catch((error: unknown) => {
		handleWriteError(error, scopeStartEvent);
	});

	function writePayload(payload: ReportEventPayload<TData>): void {
		void enqueue(withEnvelope(payload, clock(), id));
	}

	/**
	 * `TData` is still an unresolved generic here, so TS can't distribute
	 * `ReportEventPayload` per `kind` and rejects a hand-built literal against it
	 * — the literal's own `kind` tag already guarantees membership in the real
	 * union, same reasoning as `withEnvelope`'s cast in `events.ts`.
	 */
	function writeHelperPayload(payload: Record<string, unknown>): void {
		writePayload(payload as unknown as ReportEventPayload<TData>);
	}

	return {
		id,
		started,

		write: writePayload,

		progress(completed: number, total?: number, message?: string): void {
			writeHelperPayload({
				kind: "scope-progress",
				completed,
				...(total !== undefined ? { total } : {}),
				...(message !== undefined ? { message } : {}),
			});
		},

		heartbeat(elapsedMs?: number, message?: string): void {
			writeHelperPayload({
				kind: "scope-heartbeat",
				...(elapsedMs !== undefined ? { elapsedMs } : {}),
				...(message !== undefined ? { message } : {}),
			});
		},

		diagnostic(diagnostic: ReportDiagnostic): void {
			writeHelperPayload({ kind: "diagnostic", ...diagnostic });
		},

		data(data: TData): void {
			writeHelperPayload({ kind: "data", data });
		},

		attach(body: string | Uint8Array, mediaType: string, name?: string): void {
			writeHelperPayload({
				kind: "attachment",
				mediaType,
				body,
				...(name !== undefined ? { name } : {}),
			});
		},

		output(stream: "stdout" | "stderr", chunk: string): void {
			writeHelperPayload({ kind: "output", stream, chunk });
		},

		attributes(attributes: Attributes): void {
			writeHelperPayload({ kind: "scope-attributes", attributes });
		},

		child(
			childTitle: string,
			childOptions?: ScopeSessionOptions<TData>,
		): ScopeSession<TData> {
			return createSession(write, chain, id, childTitle, childOptions);
		},

		fail(error?: unknown): void {
			status = "failed";
			capturedError = error;
		},

		skip(): void {
			status = "skipped";
		},

		async [Symbol.asyncDispose](): Promise<void> {
			if (disposed) {
				return;
			}
			disposed = true;

			const aborted = options?.signal?.aborted ?? false;
			const finalStatus: ReportScopeStatus = aborted
				? "cancelled"
				: (status ?? "ok");

			await enqueue({
				kind: "scope-end",
				timestamp: clock(),
				scopeId: id,
				status: finalStatus,
				durationMs: clock() - startedAt,
				...(finalStatus === "failed" ? { error: capturedError } : {}),
			});

			if (writeErrors.length > 0) {
				throw new AggregateError(writeErrors, "one or more writes failed");
			}
		},
	};
}

/**
 * Opens a scope on an arbitrary write function: emits `scope-start`, and
 * `scope-end` (status `"ok"` by default, or `"failed"`/`"skipped"`/
 * `"cancelled"` per `fail()`/`skip()`/an aborted `signal`) on disposal.
 *
 * Every emitting method returns `void`; ordering is guaranteed by a private
 * chain each call appends to, so `scope-end` is genuinely last without any
 * method being awaitable. Use `started` when a caller specifically needs
 * acknowledgement that `scope-start` landed.
 */
export function openScopeWith<TData>(
	write: ScopeWriter<TData>,
	parentScopeId: ReportScopeId | null,
	title: string,
	options?: ScopeSessionOptions<TData>,
): ScopeSession<TData> {
	return createSession(
		write,
		{ tail: Promise.resolve(), idle: true },
		parentScopeId,
		title,
		options,
	);
}

/** The common case: write straight to a sink. */
export function openScope<TData>(
	sink: ISink<TData>,
	parentScopeId: ReportScopeId | null,
	title: string,
	options?: ScopeSessionOptions<TData>,
): ScopeSession<TData> {
	return openScopeWith(
		(event) => sink.write(event),
		parentScopeId,
		title,
		options,
	);
}
