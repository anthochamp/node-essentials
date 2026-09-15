import { ReportEvent, ReportEventKind } from "../events.js";
import { ISink, SinkProbe } from "../sink.js";

export type FilterProxyOptions<TData> = {
	/** Only events for which this returns `true` reach the wrapped sink. */
	predicate: (event: ReportEvent<TData>) => boolean;

	/**
	 * Cheap pre-check backing `enabled()`. Defaults to `predicate`-independent
	 * pass-through.
	 */
	probe?: (probe: SinkProbe) => boolean;
};

/** Routes only the events matching `predicate` to the wrapped sink. */
export function createFilterProxy<TData>(
	sink: ISink<TData>,
	options: FilterProxyOptions<TData>,
): ISink<TData> {
	return {
		enabled: (probe: SinkProbe) => {
			if (options.probe && !options.probe(probe)) {
				return false;
			}

			return sink.enabled?.(probe) ?? true;
		},

		write: (event: ReportEvent<TData>, signal?: AbortSignal) => {
			if (!options.predicate(event)) {
				return;
			}

			return sink.write(event, signal);
		},

		flush: (signal?: AbortSignal) => sink.flush(signal),
		close: (signal?: AbortSignal) => sink.close(signal),
	};
}

/** Preset: only events whose `kind` is one of `kinds`. */
export function byKind<TData>(
	...kinds: readonly ReportEventKind[]
): FilterProxyOptions<TData>["predicate"] {
	const kindSet = new Set<ReportEventKind>(kinds);
	return (event) => kindSet.has(event.kind);
}
