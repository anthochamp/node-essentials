import { MeasureRegistry } from "@ac-bench/core/plugin";
import { MeasureData } from "@ac-bench/core/runner";
import { ISink, ReportDiagnostic } from "@ac-kit/app-report";
import { formatError } from "@ac-kit/core";

/**
 * Derives the generic `diagnostic` events from a measure's typed warnings, in
 * the parent.
 *
 * Warnings live in the typed result, where the plugin renders them inline per
 * row; generic sinks need them as severity-carrying events. Emitting both from
 * the child would give one fact two sources of truth, so the translation
 * happens here instead — right after the `data` event that carries the result
 * and before the case's `scope-end`.
 */
export function createMeasureDiagnosticProxy(
	inner: ISink<MeasureData>,
	registry: MeasureRegistry,
): ISink<MeasureData> {
	return {
		enabled: (probe) => inner.enabled?.(probe) ?? true,

		async write(event, signal) {
			await inner.write(event, signal);

			if (event.kind !== "data" || event.data.kind !== "case-result") {
				return;
			}

			const { measure, caseTitle, result } = event.data;

			for (const diagnostic of resolveWarnings_(registry, measure, result)) {
				await inner.write(
					{
						kind: "diagnostic",
						timestamp: event.timestamp,
						scopeId: event.scopeId,
						...diagnostic,
						// The scope this lands on is the condition's, not the case's.
						attributes: { ...diagnostic.attributes, "bench.case": caseTitle },
					},
					signal,
				);
			}
		},

		flush: (signal) => inner.flush(signal),
		close: (signal) => inner.close(signal),
	};
}

function resolveWarnings_(
	registry: MeasureRegistry,
	measure: string,
	result: unknown,
): readonly ReportDiagnostic[] {
	try {
		return registry.resolve(measure).warnings(result);
	} catch (error) {
		return [
			{
				severity: "error",
				code: "invalid-case-result",
				message: `measure "${measure}" rejected its own case result: ${formatError(error)}`,
			},
		];
	}
}
