import type { ReportEvent, ReportEventKind, ReportScopeId } from "./events.js";

export type SinkProbe = {
	kind: ReportEventKind;

	scopeId?: ReportScopeId | null;
};

/** A destination for report events: a printer, a file, a wire transport. */
export interface ISink<TData> {
	/**
	 * Fast path: veto before the emitter allocates the event. Default: always
	 * enabled.
	 */
	enabled?(probe: SinkProbe): boolean;

	write(event: ReportEvent<TData>, signal?: AbortSignal): Promise<void> | void;

	flush(signal?: AbortSignal): Promise<void> | void;

	close(signal?: AbortSignal): Promise<void> | void;
}
