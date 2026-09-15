import { ReportEvent, ReportScopeId } from "../events.js";

export type ReportEventPayload<TData> =
	ReportEvent<TData> extends infer Event
		? Omit<Event, "timestamp" | "scopeId">
		: never;

/**
 * Stamps a {@link ReportEventPayload} with its envelope, producing a full
 * {@link ReportEvent}.
 *
 * The cast is required, not just convenient: spreading a payload built from a
 * generic, still-discriminated `ReportEventPayload<TData>` union collapses it
 * into one flattened shape (the same limitation `ReportEventPayload` itself
 * works around for `Omit`), so the compiler cannot verify the merge — the
 * payload's own type already guarantees it is a valid member of the union.
 */
export function withEnvelope<TData>(
	payload: ReportEventPayload<TData>,
	timestamp: number,
	scopeId: ReportScopeId | null,
): ReportEvent<TData> {
	return { ...payload, timestamp, scopeId } as ReportEvent<TData>;
}
