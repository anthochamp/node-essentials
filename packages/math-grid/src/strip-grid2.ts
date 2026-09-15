import { GridCoord2 } from "./grid-coord2.js";
import { GridRect2 } from "./grid-rect2.js";
import { GridSize2 } from "./grid-size2.js";
import { Grid2 } from "./grid2.js";

export type StripGrid2GetCellsOptions = {
	start?: GridCoord2;
	span?: GridSize2;
	skipEmpty?: boolean;
};

/**
 * Strip grid: fixed column count, unbounded row count. Row-major storage:
 * cells[row][col].
 */
export class StripGrid2<T> extends Grid2<T> {
	readonly cols: number;
	readonly cells: (T | undefined)[][];

	constructor(cols: number) {
		super();
		this.cols = cols;
		this.cells = [];
	}

	clearRect(rect: GridRect2): void {
		for (let dr = 0; dr < rect.span.rows; dr++) {
			for (let dc = 0; dc < rect.span.cols; dc++) {
				const row = rect.start.row + dr;
				const col = rect.start.col + dc;
				if (row >= 0 && col >= 0 && col < this.cols) {
					(this.cells[row] ??= [])[col] = undefined;
				}
			}
		}
	}

	clone(): StripGrid2<T> {
		const grid = new StripGrid2<T>(this.cols);
		for (let row = 0; row < this.cells.length; row++) {
			grid.cells[row] = this.cells[row] ? [...this.cells[row]!] : [];
		}
		return grid;
	}

	/**
	 * Returns true if the coordinate is within the fixed column bounds. Rows are
	 * unbounded.
	 */
	contains(coord: GridCoord2): boolean {
		return coord.row >= 0 && coord.col >= 0 && coord.col < this.cols;
	}

	getCell(coord: GridCoord2): T | undefined {
		if (coord.row < 0 || coord.col < 0 || coord.col >= this.cols) {
			return undefined;
		}
		return this.cells[coord.row]?.[coord.col];
	}

	*getCells<O extends StripGrid2GetCellsOptions>(
		options?: O,
	): IterableIterator<
		[GridCoord2, O["skipEmpty"] extends true ? T : T | undefined]
	> {
		const { start, span, skipEmpty } = options ?? {};
		const rowStart = start?.row ?? 0;
		const rowEnd = span ? rowStart + span.rows : this.cells.length;
		const colStart = start?.col ?? 0;
		const colEnd = span ? colStart + span.cols : this.cols;

		for (let row = rowStart; row < rowEnd; row++) {
			const rowCells = this.cells[row];
			for (let col = colStart; col < colEnd; col++) {
				const value = rowCells?.[col];
				if (!(value === undefined && skipEmpty)) {
					yield [
						{ row, col },
						value as O["skipEmpty"] extends true ? T : T | undefined,
					];
				}
			}
		}
	}

	/** Returns the number of rows that contain at least one set cell. */
	getFilledRowCount(): number {
		for (let row = this.cells.length - 1; row >= 0; row--) {
			if (this.cells[row]?.some((v) => v !== undefined)) {
				return row + 1;
			}
		}
		return 0;
	}

	/** Returns the first empty cell in reading order (row-major). */
	getFirstEmpty(): GridCoord2 {
		for (let row = 0; ; row++) {
			for (let col = 0; col < this.cols; col++) {
				if (this.cells[row]?.[col] === undefined) {
					return { row, col };
				}
			}
		}
	}

	setCell(coord: GridCoord2, value: T): void {
		if (coord.row < 0 || coord.col < 0 || coord.col >= this.cols) {
			throw new Error(
				`Coordinate (row=${coord.row}, col=${coord.col}) out of bounds for strip grid with ${this.cols} columns.`,
			);
		}
		(this.cells[coord.row] ??= [])[coord.col] = value;
	}
}
