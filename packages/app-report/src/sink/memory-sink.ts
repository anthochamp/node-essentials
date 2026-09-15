import type {
	ReportAttachment,
	ReportEvent,
	ReportScopeStatus,
} from "../events.js";
import type { ISink } from "../sink.js";
import { aggregateScopeStatus } from "../util/aggregate-scope-status.js";
import { ScopeRecord, ScopeTracker } from "../util/scope-tracker.js";

/** Everything collected over one run */
export type RunSnapshot<TData> = {
	startedAt: number;
	endedAt: number;
	status: ReportScopeStatus;
	scopes: readonly ScopeRecord[];
	data: readonly TData[];
	attachments: readonly ReportAttachment[];
};

/** Retains every event, and can produce a {@link RunSnapshot} on demand. */
export class MemorySink<TData> implements ISink<TData> {
	private readonly scopeTracker = new ScopeTracker();
	private readonly recordedEvents: ReportEvent<TData>[] = [];
	private readonly dataEvents: TData[] = [];
	private readonly attachments: ReportAttachment[] = [];
	private startedAt: number | null = null;
	private endedAt: number | null = null;

	/** Every event received so far, in write order. */
	get events(): readonly ReportEvent<TData>[] {
		return this.recordedEvents;
	}

	write(event: ReportEvent<TData>): void {
		this.recordedEvents.push(event);
		this.startedAt =
			this.startedAt === null
				? event.timestamp
				: Math.min(this.startedAt, event.timestamp);
		this.endedAt =
			this.endedAt === null
				? event.timestamp
				: Math.max(this.endedAt, event.timestamp);

		switch (event.kind) {
			case "data":
				this.dataEvents.push(event.data);
				break;

			case "attachment": {
				const { body, mediaType, name } = event;
				this.attachments.push({
					body,
					mediaType,
					name,
				});
				break;
			}

			default:
				this.scopeTracker.observe(event);
				break;
		}
	}

	flush(): void {}

	close(): void {}

	/** Discards every retained event. */
	clear(): void {
		this.recordedEvents.length = 0;
		this.dataEvents.length = 0;
		this.attachments.length = 0;
		this.startedAt = null;
		this.endedAt = null;
	}

	/** A {@link RunSnapshot} built from every event received so far. */
	snapshot(): RunSnapshot<TData> {
		const roots = this.scopeTracker.roots();

		return {
			startedAt: this.startedAt ?? 0,
			endedAt: this.endedAt ?? 0,
			status: aggregateScopeStatus(
				roots.map((record) => record.status ?? "cancelled"),
			),
			scopes: this.scopeTracker.all(),
			data: [...this.dataEvents],
			attachments: [...this.attachments],
		};
	}
}
