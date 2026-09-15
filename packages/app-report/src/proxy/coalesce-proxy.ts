import type { ReportEvent } from "../events.js";
import type { ISink, SinkProbe } from "../sink.js";

export type CoalesceProxyOptions<TData> = {
	/**
	 * Maps an event to the key it coalesces on, or `null` for an event that must
	 * never be held (passed straight through, flushing whatever is pending).
	 */
	keyOf: (event: ReportEvent<TData>) => string | null;

	/** Force-flushes a pending event after this long, even with no new arrival. */
	maxHoldMs?: number;
};

/**
 * Collapses consecutive events that `keyOf` maps to the same key, keeping only
 * the newest — bounds queue growth from high-frequency, individually worthless
 * events (progress, heartbeat) without reordering anything else.
 *
 * At most one event is ever held: a new event sharing the pending one's key
 * replaces it silently; a new event with a different key (or no key at all)
 * flushes the pending one first, preserving relative order.
 */
class CoalesceProxy_<TData> implements ISink<TData> {
	private readonly keyOf: (event: ReportEvent<TData>) => string | null;
	private readonly maxHoldMs: number | undefined;
	private pending: ReportEvent<TData> | null = null;
	private pendingKey: string | null = null;
	private pendingTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(
		private readonly sink: ISink<TData>,
		options: CoalesceProxyOptions<TData>,
	) {
		this.keyOf = options.keyOf;
		this.maxHoldMs = options.maxHoldMs;
	}

	enabled(probe: SinkProbe): boolean {
		return this.sink.enabled?.(probe) ?? true;
	}

	async write(event: ReportEvent<TData>, signal?: AbortSignal): Promise<void> {
		const key = this.keyOf(event);

		if (key !== null && this.pendingKey === key) {
			this.pending = event;
			return;
		}

		await this.flushPending(signal);

		if (key === null) {
			await this.sink.write(event, signal);
			return;
		}

		this.pending = event;
		this.pendingKey = key;
		this.scheduleMaxHold();
	}

	async flush(signal?: AbortSignal): Promise<void> {
		await this.flushPending(signal);
		await this.sink.flush(signal);
	}

	async close(signal?: AbortSignal): Promise<void> {
		this.clearTimer();
		await this.flushPending(signal);
		await this.sink.close(signal);
	}

	private scheduleMaxHold(): void {
		this.clearTimer();
		if (this.maxHoldMs === undefined) {
			return;
		}

		this.pendingTimer = setTimeout(() => {
			void this.flushPending();
		}, this.maxHoldMs);
	}

	private clearTimer(): void {
		if (this.pendingTimer !== null) {
			clearTimeout(this.pendingTimer);
			this.pendingTimer = null;
		}
	}

	private async flushPending(signal?: AbortSignal): Promise<void> {
		this.clearTimer();
		if (this.pending === null) {
			return;
		}

		const event = this.pending;
		this.pending = null;
		this.pendingKey = null;
		await this.sink.write(event, signal);
	}
}

/** See {@link CoalesceProxyOptions}. */
export function createCoalesceProxy<TData>(
	inner: ISink<TData>,
	options: CoalesceProxyOptions<TData>,
): ISink<TData> {
	return new CoalesceProxy_(inner, options);
}
