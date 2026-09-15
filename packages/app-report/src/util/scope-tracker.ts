import type { Attributes } from "../attributes.js";
import type {
	ReportDiagnostic,
	ReportEvent,
	ReportScopeId,
	ReportScopeStatus,
} from "../events.js";

/** Thrown when an event references a scope `id` no `scope-start` ever declared. */
export class UnknownScopeError extends Error {
	constructor(readonly scopeId: ReportScopeId | null) {
		super(`No scope-start seen for scope id "${scopeId}"`);
		this.name = "UnknownScopeError";
	}
}

/** Point-in-time view of one scope, built up from the events observed so far. */
export type ScopeRecord = {
	id: ReportScopeId;
	parentId: ReportScopeId | null;
	title: string;
	key: string;
	startedAt: number;
	total?: number;
	/** Set only by `scope-progress`. */
	completed: number;
	progressMessage?: string;
	/** Set only by `scope-heartbeat`. Never touches `completed`. */
	lastHeartbeatAt?: number;
	heartbeatMessage?: string;
	/** Every `diagnostic` event observed for this scope, in write order. */
	diagnostics: ReportDiagnostic[];
	attributes: Attributes;
	status: ReportScopeStatus | null;
	durationMs: number | null;
	error?: unknown;
};

/**
 * Reconstructs the scope tree from a stream of {@link ReportEvent}s.
 *
 * Shared by every sink that needs the tree (indentation, dotted paths, JUnit
 * nesting, GitHub group nesting, duration roll-ups) so each one doesn't
 * re-derive it from the raw event stream independently.
 */
export class ScopeTracker {
	private readonly records = new Map<ReportScopeId, ScopeRecord>();
	private readonly childIds = new Map<ReportScopeId | null, ReportScopeId[]>();

	/** Feed one event into the tracker, updating its internal state. */
	observe(event: ReportEvent<unknown>): void {
		switch (event.kind) {
			case "scope-start": {
				const record: ScopeRecord = {
					id: event.scopeId,
					parentId: event.parentId,
					title: event.title,
					key: event.key,
					startedAt: event.timestamp,
					total: event.total,
					completed: 0,
					diagnostics: [],
					attributes: event.attributes ?? {},
					status: null,
					durationMs: null,
				};

				this.records.set(record.id, record);

				const siblings = this.childIds.get(event.parentId);
				if (siblings) {
					siblings.push(record.id);
				} else {
					this.childIds.set(event.parentId, [record.id]);
				}

				break;
			}

			case "scope-attributes": {
				const record = this.getOrThrow(event.scopeId);
				record.attributes = { ...record.attributes, ...event.attributes };
				break;
			}

			case "scope-progress": {
				const record = this.getOrThrow(event.scopeId);
				record.completed = event.completed;
				if (event.total !== undefined) {
					record.total = event.total;
				}
				record.progressMessage = event.message;
				break;
			}

			case "scope-heartbeat": {
				const record = this.getOrThrow(event.scopeId);
				record.lastHeartbeatAt = event.timestamp;
				record.heartbeatMessage = event.message;
				break;
			}

			case "diagnostic": {
				if (event.scopeId !== null) {
					const record = this.getOrThrow(event.scopeId);
					record.diagnostics.push({
						severity: event.severity,
						code: event.code,
						message: event.message,
						attributes: event.attributes,
					});
				}
				break;
			}

			case "scope-end": {
				const record = this.getOrThrow(event.scopeId);
				record.status = event.status;
				record.durationMs = event.durationMs;
				record.error = event.error;
				if (event.attributes) {
					record.attributes = { ...record.attributes, ...event.attributes };
				}
				break;
			}

			case "output":
			case "attachment":
			case "data":
				break;
		}
	}

	/** The scope record for `id`, or `undefined` if no `scope-start` declared it. */
	get(id: ReportScopeId): ScopeRecord | undefined {
		return this.records.get(id);
	}

	/** Every scope observed so far, in `scope-start` order. */
	all(): readonly ScopeRecord[] {
		return [...this.records.values()];
	}

	/** Direct children of `id`, in the order their `scope-start` was observed. */
	children(id: ReportScopeId | null): readonly ScopeRecord[] {
		const ids = this.childIds.get(id) ?? [];
		return ids.map((childId) => this.getOrThrow(childId));
	}

	/** Top-level scopes (`parentId === null`). */
	roots(): readonly ScopeRecord[] {
		return this.children(null);
	}

	/** Scopes with no `scope-end` observed yet. */
	open(): readonly ScopeRecord[] {
		return [...this.records.values()].filter(
			(record) => record.status === null,
		);
	}

	/** The chain from the root to `id`, inclusive, root first. */
	path(id: ReportScopeId): readonly ScopeRecord[] {
		const chain: ScopeRecord[] = [];

		let current: ScopeRecord | undefined = this.getOrThrow(id);
		while (current) {
			chain.push(current);

			current =
				current.parentId === null
					? undefined
					: this.getOrThrow(current.parentId);
		}

		return chain.reverse();
	}

	/** Depth of `id` below the root scopes (a root scope has depth 0). */
	depth(id: ReportScopeId): number {
		return this.path(id).length - 1;
	}

	private getOrThrow(id: ReportScopeId): ScopeRecord {
		const record = this.records.get(id);
		if (!record) {
			throw new UnknownScopeError(id);
		}

		return record;
	}
}
