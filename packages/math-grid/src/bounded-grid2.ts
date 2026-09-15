import { GridCoord2 } from "./grid-coord2.js";
import { GridSize2 } from "./grid-size2.js";
import { Grid2 } from "./grid2.js";

/**
 * Bounded grid: fixed row and column counts. Flat 1D storage: cells[row * cols
 * + col].
 */
export class BoundedGrid2<T> extends Grid2<T> {
	readonly rows: number;
	readonly cols: number;
	readonly cells: (T | undefined)[];

	constructor(size: GridSize2) {
		super();
		this.rows = size.rows;
		this.cols = size.cols;
		this.cells = Array.from<T | undefined>({ length: size.rows * size.cols });
	}

	clone(): BoundedGrid2<T> {
		const grid = new BoundedGrid2<T>({ rows: this.rows, cols: this.cols });
		for (let i = 0; i < this.cells.length; i++) {
			grid.cells[i] = this.cells[i];
		}
		return grid;
	}

	contains(coord: GridCoord2): boolean {
		return (
			coord.row >= 0 &&
			coord.row < this.rows &&
			coord.col >= 0 &&
			coord.col < this.cols
		);
	}

	getCell(coord: GridCoord2): T | undefined {
		if (!this.contains(coord)) {
			return undefined;
		}
		return this.cells[coord.row * this.cols + coord.col];
	}

	*getCells(): IterableIterator<[GridCoord2, T]> {
		for (let row = 0; row < this.rows; row++) {
			for (let col = 0; col < this.cols; col++) {
				const value = this.cells[row * this.cols + col];
				if (value !== undefined) {
					yield [{ row, col }, value];
				}
			}
		}
	}

	/**
	 * Returns the first empty cell in reading order (row-major), or undefined if
	 * the grid is full.
	 */
	getFirstEmpty(): GridCoord2 | undefined {
		for (let row = 0; row < this.rows; row++) {
			for (let col = 0; col < this.cols; col++) {
				if (this.cells[row * this.cols + col] === undefined) {
					return { row, col };
				}
			}
		}
		return undefined;
	}

	setCell(coord: GridCoord2, value: T): void {
		if (!this.contains(coord)) {
			throw new Error(
				`Coordinate (row=${coord.row}, col=${coord.col}) out of bounds for bounded grid of size ${this.rows}×${this.cols}.`,
			);
		}
		this.cells[coord.row * this.cols + coord.col] = value;
	}
}
