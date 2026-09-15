import { defineReporterPlugin } from "@ac-bench/core/plugin";

import { MeasureTableSink } from "./measure-table-sink.js";

export * from "./measure-table-sink.js";

/**
 * The live terminal table.
 *
 * Nothing to configure — it writes to the run's own output stream — so this is
 * the plugin itself rather than a factory returning one.
 */
export default defineReporterPlugin({
	id: "table",
	createSink: (context) => new MeasureTableSink(context),
});
