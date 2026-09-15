import type {
	MeasureData,
	ReporterContext,
	ReporterPlugin,
} from "@ac-bench/core/plugin";
import {
	buildConditionInput,
	defineReporterPlugin,
	groupCaseResultsByMeasure,
} from "@ac-bench/core/plugin";
import type { RunSnapshot } from "@ac-kit/app-report";
import { AggregateSink } from "@ac-kit/app-report";

export type JsonReporterOptions = {
	/** Where to write. Default: the run's output base name plus `.json`. */
	readonly output?: string;
};

/** The whole run as one JSON document, written when the run ends. */
export default function jsonReporter(
	options: JsonReporterOptions = {},
): ReporterPlugin {
	return defineReporterPlugin({
		id: "json",
		createSink: (context) =>
			new AggregateSink<MeasureData>(
				context.openOutput(options.output ?? `${context.defaultOutput}.json`),
				{ formatter: formatJson_(context) },
			),
	});
}

/** Serialises every measure present in `run` into one JSON document. */
function formatJson_(
	context: ReporterContext,
): (run: RunSnapshot<MeasureData>) => string {
	return (run) => {
		const merged: Record<string, unknown> = {};

		for (const [measureId, caseResults] of groupCaseResultsByMeasure(
			run.data,
		)) {
			if (caseResults.length === 0) {
				continue;
			}
			const plugin = context.registry.resolve(measureId);
			const section = plugin.toJsonCondition(
				buildConditionInput(measureId, caseResults),
			);
			Object.assign(merged, section as Record<string, unknown>);
		}

		return `${JSON.stringify(merged, null, 2)}\n`;
	};
}
