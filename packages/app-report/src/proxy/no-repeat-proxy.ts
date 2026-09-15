import { isDeepEqual, MS_PER_SECOND, PeriodicalTimer } from "@ac-kit/core";

import { ReportEvent, ReportScopeId } from "../events.js";
import { ReportEventPayload, withEnvelope } from "../helpers/with-envelope.js";
import { ISink, SinkProbe } from "../sink.js";

export type NoRepeatProxyOptions<TData> = {
	/**
	 * Max time since the last distinct `data` event before a pending repeat
	 * summary is force-flushed. Default 5 seconds.
	 */
	maxDelayMs?: number;

	/**
	 * Max repeat count before a pending repeat summary is force-flushed. Default
	 * 200.
	 */
	maxCount?: number;

	/** Equality check between two `data` payloads. Default `isDeepEqual`. */
	isEqual?: (a: TData, b: TData) => boolean;

	/**
	 * Builds the event written in place of `count` suppressed repeats. Default:
	 * an `output` event with a `"last message repeated N time(s)"` chunk.
	 */
	summary?: (count: number) => ReportEventPayload<TData>;
};

/**
 * Suppresses consecutive `data` events equal to the last one written, replacing
 * a run of repeats with one summary event instead — everything else
 * (`scope-start`, `output`, `attachment`, …) always passes through.
 *
 * A pending summary is force-flushed as soon as `maxCount`/`maxDelayMs` is
 * reached, whichever comes first — the latter checked both against each new
 * incoming repeat and, in case the repeats simply stop arriving, by a
 * background timer.
 */
export class NoRepeatProxy<TData> implements ISink<TData> {
	private readonly maxDelayMs: number;
	private readonly maxCount: number;
	private readonly isEqual: (a: TData, b: TData) => boolean;
	private readonly summary: (count: number) => ReportEventPayload<TData>;
	private readonly timer: PeriodicalTimer;

	private lastData: TData | null = null;
	private lastScopeId: ReportScopeId | null = null;
	private lastDataAt = 0;
	private skipCount = 0;

	constructor(
		private readonly sink: ISink<TData>,
		options?: NoRepeatProxyOptions<TData>,
	) {
		this.maxDelayMs = options?.maxDelayMs ?? 5 * MS_PER_SECOND;
		this.maxCount = options?.maxCount ?? 200;
		this.isEqual = options?.isEqual ?? isDeepEqual;
		this.summary =
			options?.summary ??
			((count) => ({
				kind: "output",
				stream: "stdout",
				chunk: `last message repeated ${count} time(s)\n`,
			}));

		this.timer = new PeriodicalTimer(() => this.handleTick(), MS_PER_SECOND, {
			waitForCompletion: true,
		});
		this.timer.start();
	}

	enabled(probe: SinkProbe): boolean {
		return this.sink.enabled?.(probe) ?? true;
	}

	async write(event: ReportEvent<TData>, signal?: AbortSignal): Promise<void> {
		if (event.kind !== "data") {
			await this.sink.write(event, signal);
			return;
		}

		const isRepeat =
			this.lastData !== null && this.isEqual(event.data, this.lastData);

		if (isRepeat && this.skipCount + 1 < this.maxCount) {
			const overDelay = event.timestamp - this.lastDataAt >= this.maxDelayMs;
			if (!overDelay) {
				this.skipCount++;
				return;
			}
		}

		await this.flushSummary(signal);

		this.lastData = event.data;
		this.lastScopeId = event.scopeId;
		this.lastDataAt = event.timestamp;
		await this.sink.write(event, signal);
	}

	flush(signal?: AbortSignal): Promise<void> | void {
		return this.sink.flush(signal);
	}

	async close(signal?: AbortSignal): Promise<void> {
		this.timer.stop();
		await this.flushSummary(signal);
		await this.sink.close(signal);
	}

	private async handleTick(): Promise<void> {
		if (this.skipCount === 0) {
			return;
		}

		if (Date.now() - this.lastDataAt >= this.maxDelayMs) {
			await this.flushSummary();
		}
	}

	private async flushSummary(signal?: AbortSignal): Promise<void> {
		if (this.skipCount === 0) {
			return;
		}

		const count = this.skipCount;
		this.skipCount = 0;

		await this.sink.write(
			withEnvelope(this.summary(count), Date.now(), this.lastScopeId),
			signal,
		);
	}
}
