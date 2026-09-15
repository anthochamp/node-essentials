import type { DataFrame } from "@ac-kit/model-dataset";
import { dataFrameFromColumns } from "@ac-kit/model-dataset";

/** One named curve, sampled at the same positions as its siblings. */
export type Series = {
	name: string;
	/** Parallel to the shared sample positions. */
	values: readonly number[];
};

/**
 * Assembles sampled curves into the long-format frame every mark expects: one
 * row per (series, sample), with the series name as its own categorical
 * column.
 *
 * Long rather than wide because a `PlotSpec` encodes _fields_, so N curves in N
 * columns would need N encodings and could not share a colour legend. One
 * `series` column colour-encodes to any number of curves with one spec.
 *
 * O(samples x series).
 *
 * @param positions The shared x positions.
 * @param series One entry per curve; each `values` array must match `positions`
 *   in length.
 * @param names Field names, so a spec's `field` references read as the maths
 *   rather than as `"x"`/`"y"`.
 */
export function curveFrame(
	positions: readonly number[],
	series: readonly Series[],
	names: { x: string; y: string; series: string },
): DataFrame {
	const rowCount = positions.length * series.length;
	const positionColumn = new Float64Array(rowCount);
	const valueColumn = new Float64Array(rowCount);
	const seriesColumn: string[] = [];

	let at = 0;
	for (const curve of series) {
		for (let index = 0; index < positions.length; index++) {
			positionColumn[at] = positions[index] as number;
			valueColumn[at] = curve.values[index] ?? Number.NaN;
			seriesColumn.push(curve.name);
			at++;
		}
	}

	return dataFrameFromColumns(
		[
			{ name: names.x, kind: "quantitative" },
			{ name: names.y, kind: "quantitative" },
			{ name: names.series, kind: "nominal" },
		],
		[positionColumn, valueColumn, seriesColumn],
	);
}
