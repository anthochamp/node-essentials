import type { Geometry } from "../geo/geometry.js";

/**
 * One cell. `null` is absent, not zero and not empty.
 *
 * Numbers and bigints are unformatted: a renderer applies the owning field's
 * format, so the same value reads identically in every output medium.
 */
export type Value = string | number | bigint | boolean | Geometry | null;

/**
 * One field's values, in row order.
 *
 * A typed array is the canonical form for a complete, null-free numeric field:
 * it stores eight bytes per value with no boxing, which a boxed array cannot do
 * because it is heterogeneous by definition. A field that is still filling in,
 * or that has gaps, uses the boxed form; `DataFrameBuilder` chooses.
 */
export type Column = Float64Array | Int32Array | Value[];

/**
 * One cell, whichever representation the column uses.
 *
 * @returns The value, or `null` when `rowIndex` is out of range.
 */
export function columnCell(column: Column, rowIndex: number): Value {
	if (rowIndex < 0 || rowIndex >= column.length) {
		return null;
	}
	return column[rowIndex] ?? null;
}
