import type {
	MeasureData,
	ReporterContext,
	ReporterPlugin,
} from "@ac-bench/core/plugin";
import {
	buildConditionInput,
	conditionFrame,
	defineReporterPlugin,
	groupCaseResultsByMeasure,
} from "@ac-bench/core/plugin";
import type { RunSnapshot } from "@ac-kit/app-report";
import { AggregateSink } from "@ac-kit/app-report";
import { renderFrameAsCsv } from "@ac-kit/format-csv";

export type CsvReporterOptions = {
	/** Where to write. Default: the run's output base name plus `.csv`. */
	readonly output?: string;
};

/** The whole run as CSV, one table per measure. */
export default function csvReporter(
	options: CsvReporterOptions = {},
): ReporterPlugin {
	return defineReporterPlugin({
		id: "csv",
		createSink: (context) =>
			new AggregateSink<MeasureData>(
				context.openOutput(options.output ?? `${context.defaultOutput}.csv`),
				{ formatter: formatCsv_(context) },
			),
	});
}

/** Renders every measure present in `run`, one table each, blank-line separated. */
function formatCsv_(
	context: ReporterContext,
): (run: RunSnapshot<MeasureData>) => string {
	return (run) => {
		const sections: string[] = [];

		for (const [measureId, caseResults] of groupCaseResultsByMeasure(
			run.data,
		)) {
			if (caseResults.length === 0) {
				continue;
			}
			const plugin = context.registry.resolve(measureId);
			const frame = conditionFrame(
				plugin,
				buildConditionInput(measureId, caseResults),
			);
			sections.push(renderFrameAsCsv(frame));
		}

		return sections.join("\n");
	};
}
