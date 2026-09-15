import type { Formatter } from "../formatter.js";
import {
	type SerializeReportEventOptions,
	serializeReportEvent,
} from "../util/serialize-event.js";
import {
	WritableStreamSink,
	WritableStreamSinkOptions,
} from "./writable-stream-sink.js";

/** Renders one `serializeReportEvent` JSON object per line. */
export function ndjsonFormatter<TData>(
	options?: SerializeReportEventOptions,
): Formatter<TData> {
	return (event) =>
		JSON.stringify(serializeReportEvent(event, options)) ?? null;
}

/**
 * `WritableStreamSink` preset rendering newline-delimited JSON.
 *
 * The canonical structured wire format, and the prerequisite for every
 * out-of-process transport (`HttpBatchSink`, `OtlpSink`, …).
 */
export function createNdjsonSink<TData>(
	stream: WritableStream<string>,
	options?: SerializeReportEventOptions &
		Omit<WritableStreamSinkOptions<TData>, "formatter">,
): WritableStreamSink<TData> {
	return new WritableStreamSink<TData>(stream, {
		...options,
		formatter: ndjsonFormatter<TData>(options),
	});
}
