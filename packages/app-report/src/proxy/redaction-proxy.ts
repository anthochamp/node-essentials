import {
	clone,
	getAtPath,
	setAtPath,
	traverse,
	TraverseContinue,
	type PropertyPath,
} from "@ac-kit/core";

import { Attributes } from "../attributes.js";
import { ReportEvent } from "../events.js";
import { ISink, SinkProbe } from "../sink.js";

export type RedactionProxyOptions = {
	/** Exact attribute paths to redact, e.g. `["auth", "password"]`. */
	attributePaths?: readonly PropertyPath[];

	/**
	 * Patterns matched against title/output/attachment name and string attribute
	 * values.
	 */
	patterns?: readonly RegExp[];

	/** Default `"[redacted]"`. */
	replacement?: string;
};

const DEFAULT_REPLACEMENT = "[redacted]";

/**
 * Strips secrets from attributes, titles, subprocess output and text attachment
 * bodies before they reach the wrapped sink.
 *
 * Security baseline requirement ("never log secrets") — composed at the emitter
 * so no sink downstream of it can be wired around it.
 */
export function createRedactionProxy<TData>(
	sink: ISink<TData>,
	options?: RedactionProxyOptions,
): ISink<TData> {
	const replacement = options?.replacement ?? DEFAULT_REPLACEMENT;
	const attributePaths = options?.attributePaths ?? [];

	const patterns = options?.patterns ?? [];
	// Non-global copies, safe for repeated stateless `.test()` calls.
	const testPatterns = patterns.map(
		(pattern) => new RegExp(pattern.source, pattern.flags.replace("g", "")),
	);
	// Global copies, for `.replace()`-based substitution.
	const replacePatterns = patterns.map(
		(pattern) =>
			new RegExp(
				pattern.source,
				pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
			),
	);

	function redactText(text: string): string {
		let result = text;
		for (const pattern of replacePatterns) {
			result = result.replace(pattern, replacement);
		}
		return result;
	}

	function matchesAnyPattern(text: string): boolean {
		return testPatterns.some((pattern) => pattern.test(text));
	}

	function redactAttributes(attributes: Attributes): Attributes {
		// `descriptors: false` reads every accessor into a plain writable property,
		// so the rewrites below reach a secret sitting behind a getter
		let result = clone(attributes, { recursive: true, descriptors: false });

		for (const path of attributePaths) {
			if (getAtPath(result, path) !== undefined) {
				setAtPath(result, path, replacement);
			}
		}

		if (testPatterns.length > 0) {
			result = traverse(
				result,
				(value, context) => {
					if (typeof value === "string" && matchesAnyPattern(value)) {
						context.replace(replacement);
					}
					return TraverseContinue;
				},
				{ visitPrimitives: true },
			) as Record<string, unknown>;
		}

		return result;
	}

	function redactEvent(event: ReportEvent<TData>): ReportEvent<TData> {
		switch (event.kind) {
			case "scope-start":
				return {
					...event,
					title: redactText(event.title),
					attributes: event.attributes && redactAttributes(event.attributes),
				};

			case "scope-attributes":
				return { ...event, attributes: redactAttributes(event.attributes) };

			case "scope-end":
				return {
					...event,
					attributes: event.attributes && redactAttributes(event.attributes),
				};

			case "output":
				return { ...event, chunk: redactText(event.chunk) };

			case "attachment": {
				return {
					...event,
					name: event.name === undefined ? undefined : redactText(event.name),
					body:
						typeof event.body === "string" &&
						event.mediaType.startsWith("text/")
							? redactText(event.body)
							: event.body,
				};
			}

			case "diagnostic":
				return {
					...event,
					message: redactText(event.message),
					attributes: event.attributes && redactAttributes(event.attributes),
				};

			default:
				return event;
		}
	}

	return {
		enabled: (probe: SinkProbe) => sink.enabled?.(probe) ?? true,
		write: (event: ReportEvent<TData>, signal?: AbortSignal) =>
			sink.write(redactEvent(event), signal),
		flush: (signal?: AbortSignal) => sink.flush(signal),
		close: (signal?: AbortSignal) => sink.close(signal),
	};
}
