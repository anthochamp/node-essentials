import { LossyQueue } from "@ac-kit/data";

import type { ReportEvent, ReportEventKind, ReportScopeId } from "../events.js";
import type { FormatContext, Formatter } from "../formatter.js";
import type { ISink, SinkProbe } from "../sink.js";
import { ScopeTracker } from "../util/scope-tracker.js";

const BUFFERED_KINDS = new Set<ReportEventKind>([
	"output",
	"scope-progress",
	"scope-attributes",
	"diagnostic",
	"data",
]);

export type FailureCollectorSinkOptions<TData> = {
	/** Renders each collected event into the summary written at `close()`. */
	formatter: Formatter<TData>;

	/** Max number of failed scopes retained. Default: unbounded. */
	maxFailures?: number;

	/**
	 * Whether each failed scope's buffered output is replayed in the summary,
	 * using the same bounded per-scope ring as `TailWindowProxy`. Default
	 * `true`.
	 */
	includeOutput?: boolean;

	/**
	 * Max buffered events per open scope, only used when `includeOutput`. Default
	 * `200`.
	 */
	windowSize?: number;
};

type FailureRecord<TData> = {
	scopeEnd: Extract<ReportEvent<TData>, { kind: "scope-end" }>;
	events: readonly ReportEvent<TData>[];
};

/**
 * Forwards every event to the wrapped sink unchanged, and additionally buffers
 * each `"failed"` scope; at `close()`, re-renders and re-writes them together
 * as a summary, so a failure doesn't need to be found by scrolling back through
 * the rest of the run's output.
 */
export class FailureCollectorSink<TData> implements ISink<TData> {
	private readonly scopeTracker = new ScopeTracker();
	private readonly rings = new Map<
		ReportScopeId,
		LossyQueue<ReportEvent<TData>>
	>();
	private readonly failures: FailureRecord<TData>[] = [];
	private readonly windowSize: number;
	private readonly includeOutput: boolean;
	private readonly maxFailures: number;
	private lastTimestamp = 0;

	constructor(
		private readonly sink: ISink<TData>,
		private readonly options: FailureCollectorSinkOptions<TData>,
	) {
		this.windowSize = options.windowSize ?? 200;
		this.includeOutput = options.includeOutput ?? true;
		this.maxFailures = options.maxFailures ?? Number.POSITIVE_INFINITY;
	}

	enabled(probe: SinkProbe): boolean {
		return this.sink.enabled?.(probe) ?? true;
	}

	async write(event: ReportEvent<TData>, signal?: AbortSignal): Promise<void> {
		this.lastTimestamp = Math.max(this.lastTimestamp, event.timestamp);
		this.scopeTracker.observe(event);

		if (
			event.kind === "scope-start" &&
			this.includeOutput &&
			event.scopeId !== null
		) {
			this.rings.set(
				event.scopeId,
				new LossyQueue(undefined, {
					capacity: this.windowSize,
					overflowPolicy: "evict",
				}),
			);
		} else if (event.kind === "scope-end") {
			const ring =
				event.scopeId === null ? undefined : this.rings.get(event.scopeId);
			if (event.scopeId !== null) {
				this.rings.delete(event.scopeId);
			}

			if (
				event.status === "failed" &&
				this.failures.length < this.maxFailures
			) {
				this.failures.push({ scopeEnd: event, events: ring ? [...ring] : [] });
			}
		} else if (
			this.includeOutput &&
			BUFFERED_KINDS.has(event.kind) &&
			event.scopeId !== null
		) {
			this.rings.get(event.scopeId)?.enqueue(event);
		}

		await this.sink.write(event, signal);
	}

	flush(signal?: AbortSignal): Promise<void> | void {
		return this.sink.flush(signal);
	}

	/**
	 * Renders and writes the buffered failures as a summary, then closes the
	 * wrapped sink.
	 */
	async close(signal?: AbortSignal): Promise<void> {
		const context: FormatContext = { scopes: this.scopeTracker };

		for (const failure of this.failures) {
			await this.writeRendered(failure.scopeEnd, context, signal);

			for (const event of failure.events) {
				await this.writeRendered(event, context, signal);
			}
		}

		this.failures.length = 0;
		await this.sink.close(signal);
	}

	private async writeRendered(
		event: ReportEvent<TData>,
		context: FormatContext,
		signal?: AbortSignal,
	): Promise<void> {
		const rendered = this.options.formatter(event, context);
		if (rendered === null) {
			return;
		}

		await this.sink.write(
			{
				kind: "output",
				timestamp: this.lastTimestamp,
				scopeId: null,
				stream: "stdout",
				chunk: `${rendered}\n`,
			},
			signal,
		);
	}
}
