import { GridCoord2 } from "./grid-coord2.js";
import { Grid2 } from "./grid2.js";

/**
 * Row grid: fixed row count, unbounded column count. Row-major storage:
 * cells[row][col].
 */
export class RowGrid2<T> extends Grid2<T> {
	readonly rows: number;
	readonly cells: (T | undefined)[][];

	constructor(rows: number) {
		super();
		this.rows = rows;
		this.cells = [];
	}

	clone(): RowGrid2<T> {
		const grid = new RowGrid2<T>(this.rows);
		for (let row = 0; row < this.cells.length; row++) {
			grid.cells[row] = this.cells[row] ? [...this.cells[row]!] : [];
		}
		return grid;
	}

	/**
	 * Returns true if the coordinate is within the fixed row bounds. Cols are
	 * unbounded.
	 */
	contains(coord: GridCoord2): boolean {
		return coord.col >= 0 && coord.row >= 0 && coord.row < this.rows;
	}

	getCell(coord: GridCoord2): T | undefined {
		if (coord.col < 0 || coord.row < 0 || coord.row >= this.rows) {
			return undefined;
		}
		return this.cells[coord.row]?.[coord.col];
	}

	*getCells(): IterableIterator<[GridCoord2, T]> {
		for (let row = 0; row < this.rows; row++) {
			const rowCells = this.cells[row];
			if (!rowCells) {
				continue;
			}
			for (let col = 0; col < rowCells.length; col++) {
				const value = rowCells[col];
				if (value !== undefined) {
					yield [{ row, col }, value];
				}
			}
		}
	}

	/** Returns the first empty cell in column-major order (cols grow rightward). */
	getFirstEmpty(): GridCoord2 {
		for (let col = 0; ; col++) {
			for (let row = 0; row < this.rows; row++) {
				if (this.getCell({ row, col }) === undefined) {
					return { row, col };
				}
			}
		}
	}

	setCell(coord: GridCoord2, value: T): void {
		if (coord.col < 0 || coord.row < 0 || coord.row >= this.rows) {
			throw new Error(
				`Coordinate (row=${coord.row}, col=${coord.col}) out of bounds for row grid with ${this.rows} rows.`,
			);
		}
		(this.cells[coord.row] ??= [])[coord.col] = value;
	}
}
