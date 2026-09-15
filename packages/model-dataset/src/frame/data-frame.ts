import type { Column, Value } from "./column.js";
import { columnCell } from "./column.js";
import type { FieldDescriptor } from "./field.js";

/** Frame-level presentation metadata: what a title or a caption would say. */
export type FrameMeta = {
	title?: string;
	description?: string;
	/** Rendered below the data. Free-form; callers own the meaning. */
	footnotes?: string[];
	/** Producer-defined, opaque to every renderer. */
	attributes?: Record<string, unknown>;
};

/**
 * A relation: named, typed columns of equal length.
 *
 * Columnar because that is how it is read — a renderer scans one field
 * end-to-end to find a domain, then maps it — and because a complete numeric
 * column can then be a typed array rather than a boxed one. Rows are reached
 * through {@link dataFrameRow}, and built through {@link dataFrameFromRows} or
 * `DataFrameBuilder`.
 *
 * `columns` is parallel to `fields`: `columns[i]` holds `fields[i]`'s values.
 */
export type DataFrame = {
	/** Machine name, for joining several frames or naming an output file. */
	name?: string;
	fields: FieldDescriptor[];
	columns: Column[];
	rowCount: number;
	meta?: FrameMeta;
};

/** A row carrying more cells than the frame has fields. */
export class DataFrameShapeError extends Error {
	constructor(
		readonly rowIndex: number,
		readonly fieldCount: number,
		readonly cellCount: number,
	) {
		super(
			`Row ${rowIndex} has ${cellCount} cells, expected at most ${fieldCount}`,
		);
		this.name = "DataFrameShapeError";
	}
}

/** A field name that the frame does not declare. */
export class UnknownFieldError extends Error {
	constructor(readonly fieldName: string) {
		super(`No field named "${fieldName}"`);
		this.name = "UnknownFieldError";
	}
}

/**
 * Position of a field within the frame, or `-1`.
 *
 * O(n) in the field count, which is small; a caller resolving many names should
 * build its own index once instead of calling this in a loop.
 */
export function findDataFrameFieldIndexByName(
	frame: DataFrame,
	name: string,
): number {
	return frame.fields.findIndex((field) => field.name === name);
}

/**
 * One field's descriptor, looked up by name.
 *
 * O(f) in the field count. Use {@link findDataFrameFieldIndexByName} when a
 * missing field is expected rather than exceptional.
 *
 * @throws {UnknownFieldError} When no field carries that name.
 */
export function getDataFrameFieldByName(
	frame: DataFrame,
	name: string,
): FieldDescriptor {
	const index = findDataFrameFieldIndexByName(frame, name);
	if (index === -1) {
		throw new UnknownFieldError(name);
	}
	return frame.fields[index]!;
}

/**
 * One field's values, looked up by name.
 *
 * O(f) in the field count. The column is shared, not copied.
 *
 * @throws {UnknownFieldError} When no field carries that name.
 */
export function getDataFrameColumnByName(
	frame: DataFrame,
	name: string,
): Column {
	const index = findDataFrameFieldIndexByName(frame, name);
	if (index === -1) {
		throw new UnknownFieldError(name);
	}
	return frame.columns[index]!;
}

/**
 * One row, in field order. Out-of-range indices yield an all-`null` row.
 *
 * O(f) in the field count — one indexed read per column, not a scan.
 */
export function dataFrameRow(frame: DataFrame, rowIndex: number): Value[] {
	const row = Array.from<Value>({ length: frame.columns.length });
	for (let index = 0; index < frame.columns.length; index++) {
		row[index] = columnCell(frame.columns[index] as Column, rowIndex);
	}
	return row;
}

/**
 * Builds a frame from row-major input, which is what hand-written data and most
 * producers naturally have.
 *
 * O(r × f). Short rows are padded with `null`. Columns are stored as given,
 * never packed into a typed array — `DataFrameBuilder` is the path that packs,
 * because it owns its values and knows when they are complete.
 *
 * @example
 * 	```ts
 * 	const frame = dataFrameFromRows(
 * 		[
 * 			{ name: "city", kind: "nominal" },
 * 			{ name: "population", kind: "quantitative" },
 * 		],
 * 		[
 * 			["Lyon", 522_250],
 * 			["Nantes", 320_732],
 * 		],
 * 	);
 * 	frame.rowCount; // 2
 * 	```;
 *
 * @param rows One array per row, in field order.
 * @throws {DataFrameShapeError} When a row is longer than the field list.
 */
export function dataFrameFromRows(
	fields: readonly FieldDescriptor[],
	rows: readonly (readonly Value[])[],
	meta?: FrameMeta,
): DataFrame {
	const columns: Column[] = fields.map(() =>
		Array.from<Value>({ length: rows.length }),
	);

	for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
		const row = rows[rowIndex] as readonly Value[];
		if (row.length > fields.length) {
			throw new DataFrameShapeError(rowIndex, fields.length, row.length);
		}
		for (let fieldIndex = 0; fieldIndex < fields.length; fieldIndex++) {
			(columns[fieldIndex] as Value[])[rowIndex] = row[fieldIndex] ?? null;
		}
	}

	return {
		fields: [...fields],
		columns,
		rowCount: rows.length,
		...(meta === undefined ? {} : { meta }),
	};
}

/** Columns that do not line up with the field list, or with each other. */
export class DataFrameColumnShapeError extends Error {
	constructor(
		readonly fieldCount: number,
		readonly columnLengths: number[],
	) {
		super(
			`Expected ${fieldCount} columns of equal length, got ${columnLengths.length} of lengths [${columnLengths.join(", ")}]`,
		);
		this.name = "DataFrameColumnShapeError";
	}
}

/**
 * Builds a frame from columns already in hand — the counterpart of
 * {@link dataFrameFromRows}, for a producer that computes a whole series at a
 * time rather than a record at a time.
 *
 * O(f) in the field count: columns are stored by reference, never copied or
 * repacked, so a caller that already built a `Float64Array` keeps it. That is
 * also the reason to prefer this over {@link dataFrameFromRows} for sampled data
 * — the row-major path boxes every value and then transposes it.
 *
 * @example
 * 	```ts
 * 	const frame = dataFrameFromColumns(
 * 		[
 * 			{ name: "x", kind: "quantitative" },
 * 			{ name: "y", kind: "quantitative" },
 * 		],
 * 		[Float64Array.from([0, 1, 2]), Float64Array.from([0, 1, 4])],
 * 	);
 * 	frame.rowCount; // 3
 * 	```;
 *
 * @param fields One descriptor per column, in column order.
 * @param columns Parallel to `fields`, all of the same length.
 * @throws {DataFrameColumnShapeError} When the column count differs from the
 *   field count, or the columns are not all the same length.
 */
export function dataFrameFromColumns(
	fields: readonly FieldDescriptor[],
	columns: readonly Column[],
	meta?: FrameMeta,
): DataFrame {
	const lengths = columns.map((column) => column.length);
	const rowCount = lengths[0] ?? 0;
	if (
		columns.length !== fields.length ||
		lengths.some((length) => length !== rowCount)
	) {
		throw new DataFrameColumnShapeError(fields.length, lengths);
	}

	return {
		fields: [...fields],
		columns: [...columns],
		rowCount,
		...(meta === undefined ? {} : { meta }),
	};
}

/**
 * A frame carrying only the named fields, in the order given — the projection a
 * table renderer applies to choose and order its columns.
 *
 * O(n × f) in the requested and declared field counts. Columns are shared with
 * the source frame, not copied.
 *
 * @throws {UnknownFieldError} When a name is not declared by the frame.
 */
export function dataFrameSelectFields(
	frame: DataFrame,
	names: readonly string[],
): DataFrame {
	const fields: FieldDescriptor[] = [];
	const columns: Column[] = [];

	for (const name of names) {
		const index = findDataFrameFieldIndexByName(frame, name);
		if (index === -1) {
			throw new UnknownFieldError(name);
		}
		fields.push(frame.fields[index]!);
		columns.push(frame.columns[index]!);
	}

	return {
		...(frame.name === undefined ? {} : { name: frame.name }),
		fields,
		columns,
		rowCount: frame.rowCount,
		...(frame.meta === undefined ? {} : { meta: frame.meta }),
	};
}

/**
 * A frame carrying only the fields that hold at least one non-`null` cell.
 *
 * O(r × f) worst case, less when a column has an early non-`null`. Columns are
 * shared with the source frame, not copied. Applied by the caller and never by
 * a renderer: a stable schema is sometimes the point, as it is for CSV
 * headers.
 */
export function dataFrameDropEmptyFields(frame: DataFrame): DataFrame {
	const fields: FieldDescriptor[] = [];
	const columns: Column[] = [];

	for (let index = 0; index < frame.fields.length; index++) {
		const column = frame.columns[index] as Column;
		if (!hasValue_(column, frame.rowCount)) {
			continue;
		}
		fields.push(frame.fields[index] as FieldDescriptor);
		columns.push(column);
	}

	return {
		...(frame.name === undefined ? {} : { name: frame.name }),
		fields,
		columns,
		rowCount: frame.rowCount,
		...(frame.meta === undefined ? {} : { meta: frame.meta }),
	};
}

function hasValue_(column: Column, rowCount: number): boolean {
	for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
		if (columnCell(column, rowIndex) !== null) {
			return true;
		}
	}
	return false;
}

/**
 * A copy of the frame with one more column, computed per row.
 *
 * O(r × cost of `compute`). This is how a derived quantity — a ratio to the
 * fastest row, a share of a total, a rank — becomes a field, so a table and a
 * chart read it the same way instead of each recomputing it.
 */
export function dataFrameWithField(
	frame: DataFrame,
	field: FieldDescriptor,
	compute: (frame: DataFrame, rowIndex: number) => Value,
): DataFrame {
	const values = Array.from<Value>({ length: frame.rowCount });
	for (let rowIndex = 0; rowIndex < frame.rowCount; rowIndex++) {
		values[rowIndex] = compute(frame, rowIndex);
	}

	return {
		...frame,
		fields: [...frame.fields, field],
		columns: [...frame.columns, values],
	};
}
