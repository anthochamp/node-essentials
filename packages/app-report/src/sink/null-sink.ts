import { ISink } from "../sink.js";

/** Discards every event. Also useful as a benchmark baseline for the pipeline. */
export function createNullSink<TData>(): ISink<TData> {
	return {
		enabled: () => false,
		write: () => {},
		flush: () => {},
		close: () => {},
	};
}
