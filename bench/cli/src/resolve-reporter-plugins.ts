import type { ReporterPlugin } from "@ac-bench/core/plugin";
import csvReporter from "@ac-bench/reporter-csv";
import jsonReporter from "@ac-bench/reporter-json";
import markdownReporter from "@ac-bench/reporter-markdown";
import tableReporter from "@ac-bench/reporter-table";

/**
 * The reporters this CLI ships, each with its own default options.
 *
 * Uniformly a thunk because a reporter package default-exports a factory only
 * when it has options: `table` has none and exports the plugin itself.
 */
const BUILT_INS_: Readonly<Record<string, () => ReporterPlugin>> = {
	table: () => tableReporter,
	json: () => jsonReporter(),
	markdown: () => markdownReporter(),
	csv: () => csvReporter(),
};

/**
 * Resolves reporter ids into the plugins that will run.
 *
 * A configured instance wins over the built-in of the same id, so a config file
 * that lists `jsonReporter({ output: … })` in `plugins` gets its options
 * honoured while still selecting the reporter by name.
 *
 * @throws {Error} An id names neither a configured plugin nor a built-in, or
 *   two configured plugins claim the same id.
 */
export function resolveReporterPlugins(
	ids: readonly string[],
	configured: readonly ReporterPlugin[],
): ReporterPlugin[] {
	const byId = new Map<string, ReporterPlugin>();

	for (const plugin of configured) {
		if (byId.has(plugin.id)) {
			throw new Error(`Duplicate reporter plugin id: ${plugin.id}`);
		}
		byId.set(plugin.id, plugin);
	}

	return ids.map((id) => {
		const configuredPlugin = byId.get(id);
		if (configuredPlugin) {
			return configuredPlugin;
		}

		const builtIn = BUILT_INS_[id];
		if (builtIn) {
			return builtIn();
		}

		const known = [...new Set([...Object.keys(BUILT_INS_), ...byId.keys()])];
		throw new Error(
			`Unknown reporter type: ${id}. Known reporters: ${known.join(", ")}`,
		);
	});
}
