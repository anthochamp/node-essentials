import {
	defaults,
	jsonSerializeSafe,
	type JsonReplacerFunction,
} from "@ac-kit/core";
import * as z from "zod/mini";

import { reportEventSchema, type ReportEvent } from "../events.js";

export type SerializeErrorFn = (error: unknown) => unknown;

export const SERIALIZE_ERROR_DEFAULT_FN: SerializeErrorFn = (error) =>
	jsonSerializeSafe(error, (_key, value) => value);

/**
 * `"json"` (default) round-trips through `@ac-kit/core`'s `jsonSerializeSafe`.
 * `"structured-clone"` preserves `Uint8Array`/`BigInt`/`Map`/etc. and only
 * applies the `error` hook — for transports (e.g. `postMessage`) that already
 * clone structurally and would otherwise lose those types to JSON coercion.
 */
export type SerializeMode = "json" | "structured-clone";

/**
 * Boundary-only serialization hooks, applied where an event must cross a
 * transport (NDJSON, HTTP, a worker/child-process boundary) — never on the
 * in-process hot path, which keeps the raw `error: unknown` untouched.
 *
 * BigInt, circular references and `Error` objects are already handled by
 * `@ac-kit/core`'s `jsonSerializeSafe`; these hooks only need to cover anything
 * beyond that default behaviour.
 */
export type SerializeReportEventOptions = {
	/** Transform applied to a `scope-end` event's `error` before serialization. */
	error?: SerializeErrorFn;

	/** Additional replacer applied on top of `@ac-kit/core`'s safe defaults. */
	value?: JsonReplacerFunction;

	/** Default `"json"`. */
	mode?: SerializeMode;
};

export const DEFAULT_OPTIONS_: Required<SerializeReportEventOptions> = {
	error: SERIALIZE_ERROR_DEFAULT_FN,
	value: (_key, value) => value,
	mode: "json",
};

/**
 * Serialize a {@link ReportEvent} into a JSON-safe value, ready for
 * `JSON.stringify` or a structured-clone transport.
 *
 * @param event The event to serialize.
 * @param options Serialization hooks. See {@link SerializeReportEventOptions}.
 */
export function serializeReportEvent<TData>(
	event: ReportEvent<TData>,
	options?: SerializeReportEventOptions,
): unknown {
	const effective = defaults(options, DEFAULT_OPTIONS_);

	const withSerializedError =
		event.kind === "scope-end"
			? { ...event, error: effective.error(event.error) }
			: event;

	if (effective.mode === "structured-clone") {
		return withSerializedError;
	}

	return jsonSerializeSafe(withSerializedError, effective.value);
}

/**
 * Thrown by {@link parseReportEvent} when `value` is not a well-formed wire
 * event.
 */
export class MalformedEventError extends Error {
	constructor(
		reason: string,
		readonly value: unknown,
	) {
		super(`Malformed report event: ${reason}`);
		this.name = "MalformedEventError";
	}
}

/**
 * Inverse of {@link serializeReportEvent}. `parseData` is called with the raw
 * `data` field of a `"data"` event only — every other kind is validated by
 * {@link reportEventSchema} directly, `TData` erased to `unknown` on the wire.
 *
 * @throws {MalformedEventError} `value` is not a well-formed wire event.
 */
export function parseReportEvent<TData>(
	value: unknown,
	parseData: (data: unknown) => TData,
): ReportEvent<TData> {
	const result = reportEventSchema.safeParse(value);
	if (!result.success) {
		throw new MalformedEventError(z.prettifyError(result.error), value);
	}

	const event = result.data;
	if (event.kind === "data") {
		return { ...event, data: parseData(event.data) };
	}

	return event;
}
