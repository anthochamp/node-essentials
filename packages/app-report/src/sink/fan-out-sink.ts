import type { ReportEvent } from "../events.js";
import type { ISink, SinkProbe } from "../sink.js";

export type FanOutSinkOptions = {
	/**
	 * Called for each sink that fails a `write`/`flush`/`close`. When omitted,
	 * failures are collected and thrown together as an `AggregateError` once
	 * every sink has settled.
	 */
	onSinkError?: (error: unknown, index: number) => void;

	/** Whether to run sinks concurrently. Default `true`. */
	concurrent?: boolean;
};

/** Writes to every sink in `sinks`, in the order given. */
export function createFanOutSink<TData>(
	sinks: readonly ISink<TData>[],
	options?: FanOutSinkOptions,
): ISink<TData> {
	const concurrent = options?.concurrent ?? true;

	async function runAll(
		operation: (sink: ISink<TData>) => Promise<void> | void,
	): Promise<void> {
		let results: PromiseSettledResult<void>[];

		if (concurrent) {
			// Wrapped in an async closure: `operation` can throw synchronously
			// (a sync sink), which `Promise.allSettled` only settles as a
			// rejection if it's already wrapped in a promise.
			results = await Promise.allSettled(
				sinks.map((sink) => (async () => operation(sink))()),
			);
		} else {
			results = await (async () => {
				const settled: PromiseSettledResult<void>[] = [];
				for (const sink of sinks) {
					try {
						await operation(sink);
						settled.push({ status: "fulfilled", value: undefined });
					} catch (error) {
						settled.push({ status: "rejected", reason: error });
					}
				}
				return settled;
			})();
		}

		const errors: unknown[] = [];
		for (const [index, result] of results.entries()) {
			if (result.status !== "rejected") {
				return;
			}

			if (options?.onSinkError) {
				options.onSinkError(result.reason, index);
			} else {
				errors.push(result.reason);
			}
		}

		if (errors.length > 0) {
			throw new AggregateError(errors, "One or more sinks failed");
		}
	}

	return {
		enabled: (probe: SinkProbe) =>
			sinks.some((sink) => sink.enabled?.(probe) ?? true),
		write: (event: ReportEvent<TData>, signal?: AbortSignal) =>
			runAll((sink) => sink.write(event, signal)),
		flush: (signal?: AbortSignal) => runAll((sink) => sink.flush(signal)),
		close: (signal?: AbortSignal) => runAll((sink) => sink.close(signal)),
	};
}
