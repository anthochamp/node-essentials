import { MS_PER_MINUTE, MS_PER_SECOND, PeriodicalTimer } from "@ac-kit/core";

import { ReportEvent } from "../events.js";
import { ReportEventPayload, withEnvelope } from "../helpers/with-envelope.js";
import { ISink, SinkProbe } from "../sink.js";

export type IdleMarkProxyOptions<TData> = {
	/** Delay after the last write before a mark is emitted. Default 20 minutes. */
	idleDelayMs?: number;

	/**
	 * Builds the event written once the sink has been idle for `idleDelayMs`.
	 * Default: an `output` event with `chunk: "MARK\n"`.
	 */
	mark?: () => ReportEventPayload<TData>;
};

/**
 * Writes a synthetic "mark" event to the wrapped sink after a period with no
 * writes at all — a liveness heartbeat for an otherwise-silent long-running
 * process (a daemon, a log file nobody's tailed in hours).
 */
export class IdleMarkProxy<TData> implements ISink<TData> {
	private readonly idleDelayMs: number;
	private readonly mark: () => ReportEventPayload<TData>;
	private readonly timer: PeriodicalTimer;
	private lastWriteAt = Date.now();

	constructor(
		private readonly sink: ISink<TData>,
		options?: IdleMarkProxyOptions<TData>,
	) {
		this.idleDelayMs = options?.idleDelayMs ?? 20 * MS_PER_MINUTE;
		this.mark =
			options?.mark ??
			(() => ({ kind: "output", stream: "stdout", chunk: "MARK\n" }));

		this.timer = new PeriodicalTimer(() => this.handleTick(), MS_PER_SECOND);
		this.timer.start();
	}

	enabled(probe: SinkProbe): boolean {
		return this.sink.enabled?.(probe) ?? true;
	}

	async write(event: ReportEvent<TData>, signal?: AbortSignal): Promise<void> {
		this.lastWriteAt = Date.now();
		await this.sink.write(event, signal);
	}

	flush(signal?: AbortSignal): Promise<void> | void {
		return this.sink.flush(signal);
	}

	async close(signal?: AbortSignal): Promise<void> {
		this.timer.stop();
		await this.sink.close(signal);
	}

	private async handleTick(): Promise<void> {
		const now = Date.now();
		if (now - this.lastWriteAt < this.idleDelayMs) {
			return;
		}

		this.lastWriteAt = now;
		await this.sink.write(withEnvelope(this.mark(), now, null));
	}
}
