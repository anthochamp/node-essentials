import { LossyQueue } from "@ac-kit/data";

import {
	ReportEvent,
	ReportEventKind,
	ReportScopeId,
	ReportScopeStatus,
} from "../events.js";
import { ISink, SinkProbe } from "../sink.js";

const DEFAULT_ALWAYS_FORWARD_KINDS: readonly ReportEventKind[] = [
	"scope-start",
	"scope-end",
	"attachment",
];

export type TailWindowProxyOptions = {
	/** Max buffered events per open scope. Default `200`. */
	windowSize?: number;

	/**
	 * Event kinds forwarded to the wrapped sink immediately, never buffered.
	 * Default `["scope-start", "scope-end", "attachment"]`.
	 */
	alwaysForwardKinds?: readonly ReportEventKind[];
};

/**
 * Buffers per-scope events (typically `output`) in a bounded ring, replaying
 * the ring to the wrapped sink only when the scope ends `"failed"` or
 * `"cancelled"` — discarded on `"ok"`/`"skipped"`, so a noisy but healthy scope
 * never reaches the sink.
 */
export class TailWindowProxy<TData> implements ISink<TData> {
	private readonly windowSize: number;
	private readonly alwaysForwardKinds: ReadonlySet<ReportEventKind>;
	private readonly rings = new Map<
		ReportScopeId,
		LossyQueue<ReportEvent<TData>>
	>();

	constructor(
		private readonly sink: ISink<TData>,
		options?: TailWindowProxyOptions,
	) {
		this.windowSize = options?.windowSize ?? 200;
		this.alwaysForwardKinds = new Set(
			options?.alwaysForwardKinds ?? DEFAULT_ALWAYS_FORWARD_KINDS,
		);
	}

	enabled(probe: SinkProbe): boolean {
		return this.sink.enabled?.(probe) ?? true;
	}

	async write(event: ReportEvent<TData>, signal?: AbortSignal): Promise<void> {
		if (event.kind === "scope-start" && event.scopeId !== null) {
			this.rings.set(
				event.scopeId,
				new LossyQueue(undefined, {
					capacity: this.windowSize,
					overflowPolicy: "evict",
				}),
			);
		} else if (event.kind === "scope-end") {
			await this.resolveRing(event.scopeId, event.status, signal);
		}

		if (this.alwaysForwardKinds.has(event.kind)) {
			await this.sink.write(event, signal);
			return;
		}

		// Resolved scope-end already deleted its ring above, so it falls through
		// to this lookup and is forwarded directly if excluded from
		// `alwaysForwardKinds` — there is nothing left to buffer it into.
		const ring =
			event.scopeId === null ? undefined : this.rings.get(event.scopeId);
		if (!ring) {
			await this.sink.write(event, signal);
			return;
		}

		ring.enqueue(event);
	}

	flush(signal?: AbortSignal): Promise<void> | void {
		return this.sink.flush(signal);
	}

	close(signal?: AbortSignal): Promise<void> | void {
		return this.sink.close(signal);
	}

	private async resolveRing(
		scopeId: ReportScopeId | null,
		status: ReportScopeStatus,
		signal?: AbortSignal,
	): Promise<void> {
		const ring = scopeId === null ? undefined : this.rings.get(scopeId);
		if (scopeId !== null) {
			this.rings.delete(scopeId);
		}
		if (!ring) {
			return;
		}

		if (status === "failed" || status === "cancelled") {
			for (const buffered of ring) {
				await this.sink.write(buffered, signal);
			}
		}
	}
}
