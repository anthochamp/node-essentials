import type {
	Attributes,
	ISink,
	ReportScopeId,
	ScopeSession,
	ScopeSessionOptions,
} from "@ac-kit/app-report";
import { openScopeWith } from "@ac-kit/app-report";
import { captureStackTrace } from "@ac-kit/core";

import { LoggerCore } from "./_logger-core.js";
import { compareLogLevel, LogLevel } from "./log-level.js";
import type { LogRecord } from "./log-record.js";
import { LoggerOptions } from "./logger-options-from-env.js";

export type LoggerLogOptions = {
	error?: unknown;
	attributes?: Attributes;
};

export interface LoggerScope extends Logger, AsyncDisposable {
	progress(completed: number, total?: number, message?: string): void;
	fail(error?: unknown): void;
	skip(): void;
}

export type LoggerScopeOptions = Omit<ScopeSessionOptions<any>, "clock">;

const INTERNAL_STATE_TAG = Symbol("logger-internal-construct");

type InternalState_ = {
	readonly [INTERNAL_STATE_TAG]: true;
	readonly core: LoggerCore;
	readonly scopeId: ReportScopeId | null;
	readonly attributes: Attributes;
};

function createInternalState_(
	state: Omit<InternalState_, typeof INTERNAL_STATE_TAG>,
): InternalState_ {
	return { [INTERNAL_STATE_TAG]: true, ...state };
}

function isInternalState_(
	value: ISink<LogRecord> | InternalState_,
): value is InternalState_ {
	return INTERNAL_STATE_TAG in value;
}

export class Logger {
	protected readonly core: LoggerCore;
	protected readonly scopeId: ReportScopeId | null;
	protected readonly attributes: Attributes;

	constructor(sink: ISink<LogRecord>, options?: LoggerOptions);
	/** @internal Shares an existing core (queue, sink, config) with a parent logger. */
	constructor(internalState: InternalState_);
	constructor(
		sinkOrState: ISink<LogRecord> | InternalState_,
		options?: LoggerOptions,
	) {
		if (isInternalState_(sinkOrState)) {
			this.core = sinkOrState.core;
			this.scopeId = sinkOrState.scopeId;
			this.attributes = sinkOrState.attributes;
		} else {
			this.core = new LoggerCore(sinkOrState, options);
			this.scopeId = null;
			this.attributes = options?.attributes ?? {};
		}
	}

	debug(message: string, options?: LoggerLogOptions): void {
		// oxlint-disable-next-line typescript/unbound-method -- passed as a stack-capture reference point, never called unbound
		this.emitLog("debug", message, options, this.debug);
	}

	info(message: string, options?: LoggerLogOptions): void {
		// oxlint-disable-next-line typescript/unbound-method -- passed as a stack-capture reference point, never called unbound
		this.emitLog("info", message, options, this.info);
	}

	warn(message: string, options?: LoggerLogOptions): void {
		// oxlint-disable-next-line typescript/unbound-method -- passed as a stack-capture reference point, never called unbound
		this.emitLog("warn", message, options, this.warn);
	}

	error(message: string, options?: LoggerLogOptions): void {
		// oxlint-disable-next-line typescript/unbound-method -- passed as a stack-capture reference point, never called unbound
		this.emitLog("error", message, options, this.error);
	}

	fatal(message: string, options?: LoggerLogOptions): void {
		// oxlint-disable-next-line typescript/unbound-method -- passed as a stack-capture reference point, never called unbound
		this.emitLog("fatal", message, options, this.fatal);
	}

	log(level: LogLevel, message: string, options?: LoggerLogOptions): void {
		// oxlint-disable-next-line typescript/unbound-method -- passed as a stack-capture reference point, never called unbound
		this.emitLog(level, message, options, this.log);
	}

	/** Child logger with extra attributes; no scope is opened. */
	with(attributes: Attributes): Logger {
		return new Logger(
			createInternalState_({
				core: this.core,
				scopeId: this.scopeId,
				attributes: { ...this.attributes, ...attributes },
			}),
		);
	}

	/** Opens a scope; disposing the returned object emits `scope-end`. */
	scope(title: string, options?: LoggerScopeOptions): LoggerScope {
		const session = openScopeWith<LogRecord>(
			(event) => this.core.writeEvent(event),
			this.scopeId,
			title,
			{
				clock: this.core.clock,
				...options,
			},
		);

		return new LoggerScopeImpl(this.core, session, {
			...this.attributes,
			...options?.attributes,
		});
	}

	async flush(signal?: AbortSignal): Promise<void> {
		await this.core.flush(signal);
	}

	async close(signal?: AbortSignal): Promise<void> {
		await this.core.close(signal);
	}

	private emitLog(
		level: LogLevel,
		message: string,
		options: LoggerLogOptions | undefined,
		reference: Function,
	): void {
		if (compareLogLevel(level, this.core.minLevel) > 0) {
			return;
		}

		const attributes = { ...this.attributes, ...options?.attributes };

		const record: LogRecord = {
			level,
			message,
			...(options?.error !== undefined ? { error: options.error } : {}),
			...(Object.keys(attributes).length > 0 ? { attributes } : {}),
			...(this.core.captureStackAtOrBelow !== null &&
			compareLogLevel(level, this.core.captureStackAtOrBelow) <= 0
				? { stackTrace: captureStackTrace({ reference }) }
				: {}),
		};

		this.core.writeEvent({
			kind: "data",
			timestamp: this.core.clock(),
			scopeId: this.scopeId,
			data: record,
		});
	}
}

/**
 * `LoggerScope`'s imperative fail()/skip()+dispose lifecycle delegates entirely
 * to a `ScopeSession`, sharing its construction with `openScope` rather than
 * duplicating `scope-start`/`scope-end` event construction.
 */
class LoggerScopeImpl extends Logger implements LoggerScope {
	constructor(
		core: LoggerCore,
		private readonly session: ScopeSession<LogRecord>,
		attributes: Attributes,
	) {
		super(createInternalState_({ core, scopeId: session.id, attributes }));
	}

	progress(completed: number, total?: number, message?: string): void {
		this.session.progress(completed, total, message);
	}

	fail(error?: unknown): void {
		this.session.fail(error);
	}

	skip(): void {
		this.session.skip();
	}

	[Symbol.asyncDispose](): Promise<void> {
		return Promise.resolve(this.session[Symbol.asyncDispose]());
	}
}
