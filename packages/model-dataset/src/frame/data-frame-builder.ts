import type { Column, Value } from "./column.js";
import type { DataFrame, FrameMeta } from "./data-frame.js";
import { UnknownFieldError } from "./data-frame.js";
import type { FieldDescriptor } from "./field.js";
import { isNumericField } from "./field.js";

/** Whether a column is complete, all-numeric, and so worth packing. */
function isPackable_(
	field: FieldDescriptor,
	values: readonly Value[],
): boolean {
	if (!isNumericField(field)) {
		return false;
	}
	for (let index = 0; index < values.length; index++) {
		if (typeof values[index] !== "number") {
			return false;
		}
	}
	return true;
}

/**
 * Fills a frame in row by row, and lets a row already written be rewritten.
 *
 * This is the incremental path: a live view knows the schema before the first
 * observation arrives, appends a placeholder row when one starts, and
 * overwrites it as better answers come in. A partially-filled frame renders as
 * readily as a complete one — the unwritten cells are simply `null`.
 */
export class DataFrameBuilder {
	private readonly fields_: FieldDescriptor[];
	private readonly columns_: Value[][];
	private readonly indexByName_: Map<string, number>;
	private rowCount_ = 0;

	constructor(
		fields: readonly FieldDescriptor[],
		private meta_?: FrameMeta,
	) {
		this.fields_ = [...fields];
		this.columns_ = fields.map(() => []);
		this.indexByName_ = new Map(
			fields.map((field, index) => [field.name, index]),
		);
	}

	get rowCount(): number {
		return this.rowCount_;
	}

	/**
	 * Appends a row, padding missing trailing cells with `null`.
	 *
	 * @returns The new row's index, for a later {@link setCell}.
	 */
	appendRow(row?: readonly Value[]): number {
		const rowIndex = this.rowCount_;
		for (let index = 0; index < this.columns_.length; index++) {
			(this.columns_[index] as Value[])[rowIndex] = row?.[index] ?? null;
		}
		this.rowCount_++;
		return rowIndex;
	}

	/**
	 * Overwrites a row already appended. Rows between the last one and `rowIndex`
	 * are created empty.
	 */
	setRow(rowIndex: number, row: readonly Value[]): void {
		this.growTo_(rowIndex + 1);
		for (let index = 0; index < this.columns_.length; index++) {
			(this.columns_[index] as Value[])[rowIndex] = row[index] ?? null;
		}
	}

	/** @throws {UnknownFieldError} When no field carries that name. */
	setCell(rowIndex: number, fieldName: string, value: Value): void {
		const fieldIndex = this.indexByName_.get(fieldName);
		if (fieldIndex === undefined) {
			throw new UnknownFieldError(fieldName);
		}
		this.growTo_(rowIndex + 1);
		(this.columns_[fieldIndex] as Value[])[rowIndex] = value;
	}

	setMeta(meta: FrameMeta): void {
		this.meta_ = meta;
	}

	/**
	 * Snapshots the rows written so far. O(r × f).
	 *
	 * Complete numeric columns are packed into a `Float64Array`; anything with a
	 * gap or a non-numeric cell stays boxed. The result shares no storage with
	 * the builder, so building again after more rows is safe.
	 */
	build(): DataFrame {
		const columns: Column[] = this.columns_.map((values, index) => {
			const field = this.fields_[index] as FieldDescriptor;
			const slice = values.slice(0, this.rowCount_);
			if (!isPackable_(field, slice)) {
				return slice;
			}
			const packed = new Float64Array(this.rowCount_);
			for (let rowIndex = 0; rowIndex < this.rowCount_; rowIndex++) {
				packed[rowIndex] = slice[rowIndex] as number;
			}
			return packed;
		});

		return {
			fields: [...this.fields_],
			columns,
			rowCount: this.rowCount_,
			...(this.meta_ === undefined ? {} : { meta: this.meta_ }),
		};
	}

	private growTo_(rowCount: number): void {
		while (this.rowCount_ < rowCount) {
			this.appendRow();
		}
	}
}
