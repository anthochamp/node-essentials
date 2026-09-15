import type { MeasurePlugin } from "./plugin.js";
import { isMeasurePlugin } from "./registry.js";
import type { ReporterPlugin } from "./reporter-plugin.js";
import { isReporterPlugin } from "./reporter-plugin.js";

/** Either kind of plugin, as a config file lists them together. */
export type BenchPlugin = MeasurePlugin | ReporterPlugin;

/**
 * Sorts a mixed plugin list into the two typed lists the programmatic API
 * takes, preserving each kind's declaration order.
 *
 * @throws {TypeError} An entry went through neither `defineMeasurePlugin` nor
 *   `defineReporterPlugin`.
 */
export function partitionPlugins(plugins: readonly BenchPlugin[]): {
	readonly measures: readonly MeasurePlugin[];
	readonly reporters: readonly ReporterPlugin[];
} {
	const measures: MeasurePlugin[] = [];
	const reporters: ReporterPlugin[] = [];

	for (const [index, plugin] of plugins.entries()) {
		if (isMeasurePlugin(plugin)) {
			measures.push(plugin);
		} else if (isReporterPlugin(plugin)) {
			reporters.push(plugin);
		} else {
			throw new TypeError(
				`plugins[${index}] is neither a measure plugin nor a reporter plugin`,
			);
		}
	}

	return { measures, reporters };
}
