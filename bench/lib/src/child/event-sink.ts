import { MeasureData } from "@ac-bench/core/runner";
import {
	AsyncQueueSink,
	createCoalesceProxy,
	ISink,
	ReportEvent,
	serializeReportEvent,
} from "@ac-kit/app-report";

import { ChildChannel } from "./channel.js";

const MAX_QUEUE = 1024;

/**
 * The child's sink chain: coalesce the only high-frequency events, then queue
 * with backpressure, then serialize onto the IPC channel.
 *
 * Coalescing first is what makes `overflow: "block"` safe — blocking can then
 * only ever be triggered by a result, which is rare and emitted outside the
 * timed region.
 */
export function createChildEventSink(
	channel: ChildChannel,
): ISink<MeasureData> {
	const transport: ISink<MeasureData> = {
		write: (event) =>
			channel.event(serializeReportEvent(event, { mode: "structured-clone" })),
		flush: () => {},
		close: () => {},
	};

	const queue = new AsyncQueueSink(transport, {
		maxQueue: MAX_QUEUE,
		overflow: "block",
		onOverflow: (dropped) => {
			void channel.dropped(
				dropped.length,
				dropped.map((event) => event.kind),
			);
		},
		onSinkError: (error) => {
			void channel.fatal(error);
		},
	});

	return createCoalesceProxy(queue, { keyOf: coalesceKey_ });
}

function coalesceKey_(event: ReportEvent<MeasureData>): string | null {
	return event.kind === "scope-progress" || event.kind === "scope-heartbeat"
		? `${event.kind}:${event.scopeId}`
		: null;
}
