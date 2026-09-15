import {
	ChildMessage,
	MeasureData,
	ParentMessage,
	parseChildMessage,
	parseMeasureData,
} from "@ac-bench/core/runner";
import {
	ISink,
	parseReportEvent,
	ReportDiagnostic,
	ReportScopeStatus,
	ScopeTracker,
} from "@ac-kit/app-report";
import { formatError } from "@ac-kit/core";

/** How many events the parent consumes before renewing the child's credit. */
const ACK_EVERY = 128;

/** Consecutive protocol errors after which the child is no longer trusted. */
const MAX_PROTOCOL_ERRORS = 3;

/** The child's `seq` did not follow the previous one. */
export class SequenceGapError extends Error {
	constructor(
		readonly expected: number,
		readonly received: number,
	) {
		super(`expected child sequence ${expected}, got ${received}`);
		this.name = "SequenceGapError";
	}
}

export type IpcReportReceiverOptions = {
	readonly sink: ISink<MeasureData>;
	readonly send: (message: ParentMessage) => Promise<void> | void;
	readonly onDiagnostic: (diagnostic: ReportDiagnostic) => void;
	/** The child can no longer be trusted and must be terminated. */
	readonly onProtocolFailure: (error: unknown) => void;
	readonly ackEvery?: number;
};

/**
 * Turns one child's message stream into sink writes, asserting the sequence,
 * renewing the child's credit, and remembering which scopes it left open so a
 * crash can still be closed out.
 */
export class IpcReportReceiver {
	private expectedSeq = 1;
	private protocolErrors = 0;
	private lastAcked = 0;
	private readonly tracker = new ScopeTracker();

	/** The status the child reported, or `null` while it is still running. */
	status: ReportScopeStatus | null = null;

	/** The error the child reported as fatal, if any. */
	fatal: unknown = null;

	constructor(private readonly options: IpcReportReceiverOptions) {}

	/** Scopes the child opened and never closed, deepest last. */
	get openScopes(): readonly string[] {
		return this.tracker.open().map((record) => record.id);
	}

	/** The innermost scope the child has open, for attributing its output. */
	get deepestOpenScope(): string | null {
		const open = this.tracker.open();

		return open[open.length - 1]?.id ?? null;
	}

	async receive(raw: unknown): Promise<void> {
		let message: ChildMessage;

		try {
			message = parseChildMessage(raw);
		} catch (error) {
			this.recordProtocolError(error);
			return;
		}

		if (message.t === "hello" || message.t === "conditions") {
			this.recordProtocolError(
				new Error(`unexpected "${message.t}" message during a run`),
			);
			return;
		}

		if (message.seq !== this.expectedSeq) {
			this.recordProtocolError(
				new SequenceGapError(this.expectedSeq, message.seq),
			);
			return;
		}

		this.expectedSeq += 1;
		this.protocolErrors = 0;

		switch (message.t) {
			case "event":
				await this.writeEvent(message.event);
				break;

			case "dropped":
				this.options.onDiagnostic({
					severity: "warning",
					code: "events-dropped",
					message: `${message.count} report events were dropped by the child`,
					attributes: { kinds: message.kinds },
				});
				break;

			case "done":
				this.status = message.status;
				break;

			case "fatal":
				this.fatal = message.error;
				break;
		}

		// A child that has reported an outcome is already disconnecting: renewing
		// its credit now races its `process.disconnect()` and writes to a dead pipe.
		if (this.status === null && this.fatal === null) {
			await this.acknowledge();
		}
	}

	/**
	 * Writes a synthetic `scope-end` for everything the child left open, so a
	 * crash cannot strand a scope. Innermost first.
	 */
	async closeOpenScopes(error: unknown): Promise<void> {
		for (const record of [...this.tracker.open()].toReversed()) {
			const event = {
				kind: "scope-end",
				timestamp: Date.now(),
				scopeId: record.id,
				status: "failed",
				durationMs: Date.now() - record.startedAt,
				error,
			} as const;

			this.tracker.observe(event);
			await this.options.sink.write(event);
		}
	}

	private async writeEvent(raw: unknown): Promise<void> {
		try {
			const event = parseReportEvent<MeasureData>(raw, parseMeasureData);

			this.tracker.observe(event);
			await this.options.sink.write(event);
		} catch (error) {
			this.recordProtocolError(error);
		}
	}

	private recordProtocolError(error: unknown): void {
		this.protocolErrors += 1;

		this.options.onDiagnostic({
			severity: "error",
			code: "protocol-error",
			message: formatError(error),
		});

		if (this.protocolErrors >= MAX_PROTOCOL_ERRORS) {
			this.options.onProtocolFailure(error);
		}
	}

	private async acknowledge(): Promise<void> {
		const consumed = this.expectedSeq - 1;

		if (consumed - this.lastAcked < (this.options.ackEvery ?? ACK_EVERY)) {
			return;
		}

		this.lastAcked = consumed;

		try {
			await this.options.send({ t: "ack", seq: consumed });
		} catch (error) {
			// Credit renewal is advisory: a lost ack can stall the child into the
			// heartbeat timeout, but it can never corrupt what it already reported.
			this.options.onDiagnostic({
				severity: "warning",
				code: "ack-failed",
				message: `could not renew the child's credit: ${formatError(error)}`,
			});
		}
	}
}
