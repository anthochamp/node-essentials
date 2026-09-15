import { formatDuration } from "@ac-kit/core";

import type {
	ReportDiagnosticSeverity,
	ReportScopeId,
	ReportScopeStatus,
} from "../events.js";
import type { FormatContext, Formatter } from "../formatter.js";
import {
	WritableStreamSink,
	WritableStreamSinkOptions,
} from "./writable-stream-sink.js";

const SCOPE_STATUS_LABEL: Record<ReportScopeStatus, string> = {
	ok: "[OK]",
	failed: "[FAIL]",
	skipped: "[SKIP]",
	cancelled: "[CANCEL]",
};

const DIAGNOSTIC_SEVERITY_LABEL: Record<ReportDiagnosticSeverity, string> = {
	error: "[ERROR]",
	warning: "[WARN]",
	info: "[INFO]",
};

function indentFor(
	context: FormatContext,
	scopeId: ReportScopeId | null,
): string {
	if (scopeId === null) {
		return "";
	}

	const depth = context.scopes.path(scopeId).length - 1;
	return "  ".repeat(Math.max(depth, 0));
}

/**
 * Renders each event as one plain-text line, no ANSI escape codes.
 *
 * `scope-progress`/`scope-attributes`/`data` render nothing (`null`): progress
 * bars and arbitrary domain data have no generic plain-text form — a live
 * region or a domain-specific sink handles those.
 */
export const plainLineFormatter: Formatter<unknown> = (event, context) => {
	switch (event.kind) {
		case "scope-start":
			return `${indentFor(context, event.scopeId)}> ${event.title}`;

		case "scope-end": {
			const title = context.scopes.get(event.scopeId)?.title ?? event.scopeId;
			const duration = formatDuration(event.durationMs, "millisecond");
			return `${indentFor(context, event.scopeId)}${SCOPE_STATUS_LABEL[event.status]} ${title} (${duration})`;
		}

		case "output":
			return event.chunk;

		case "attachment":
			return `[attachment] ${event.name ?? "(unnamed)"} (${event.mediaType})`;

		case "diagnostic":
			return `${indentFor(context, event.scopeId)}${DIAGNOSTIC_SEVERITY_LABEL[event.severity]} ${event.message}`;

		default:
			return null;
	}
};

/**
 * `WritableStreamSink` preset with {@link plainLineFormatter}.
 *
 * The mandatory fallback when `terminal.interactive` is `false` — without it, a
 * live region corrupts non-interactive (CI) logs.
 */
export function createPlainLineSink<TData>(
	stream: WritableStream<string>,
	options?: Omit<WritableStreamSinkOptions<TData>, "formatter">,
): WritableStreamSink<TData> {
	return new WritableStreamSink<TData>(stream, {
		...options,
		formatter: plainLineFormatter,
	});
}
