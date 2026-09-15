import type { ReportEvent } from "../events.js";
import type { ISink } from "../sink.js";
import {
	serializeReportEvent,
	type SerializeReportEventOptions,
} from "../util/serialize-event.js";

export type MessageSinkOptions = {
	serialize?: SerializeReportEventOptions;
};

/**
 * Portable IPC sink: serializes each event and hands it to `post` — the
 * primitive `@ac-kit/app-system`'s `forkProcess`/worker transports build on.
 *
 * `flush`/`close` are no-ops: delivery and backpressure are `post`'s
 * responsibility, not this sink's.
 */
export function createMessageSink<TData>(
	post: (message: unknown) => void,
	options?: MessageSinkOptions,
): ISink<TData> {
	return {
		write(event: ReportEvent<TData>): void {
			post(serializeReportEvent(event, options?.serialize));
		},

		flush(): void {},

		close(): void {},
	};
}
