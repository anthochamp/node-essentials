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
import { renderFrameAsMarkdown } from "@ac-kit/format-markdown";

export type MarkdownReporterOptions = {
	/** Where to write. Default: the run's output base name plus `.md`. */
	readonly output?: string;
};

/** The whole run as one GitHub-flavoured Markdown document. */
export default function markdownReporter(
	options: MarkdownReporterOptions = {},
): ReporterPlugin {
	return defineReporterPlugin({
		id: "markdown",
		createSink: (context) =>
			new AggregateSink<MeasureData>(
				context.openOutput(options.output ?? `${context.defaultOutput}.md`),
				{ formatter: formatMarkdown_(context) },
			),
	});
}

/** Renders every measure present in `run`, one section each. */
function formatMarkdown_(
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
			sections.push(renderFrameAsMarkdown(frame));
		}

		return `${sections.join("\n\n")}\n`;
	};
}
