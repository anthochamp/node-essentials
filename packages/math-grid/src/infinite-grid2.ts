import { GridCoord2 } from "./grid-coord2.js";
import { Grid2 } from "./grid2.js";

/**
 * Unbounded grid backed by a sparse Map. Key format: "col,row". Any coordinate
 * is valid; cells are absent until explicitly set.
 */
export class InfiniteGrid2<T> extends Grid2<T> {
	readonly cells: Map<string, T>;

	constructor() {
		super();
		this.cells = new Map();
	}

	clone(): InfiniteGrid2<T> {
		const grid = new InfiniteGrid2<T>();
		for (const [key, value] of this.cells) {
			(grid.cells as Map<string, T>).set(key, value);
		}
		return grid;
	}

	/** Always true — infinite grids have no bounds. */
	contains(_coord: GridCoord2): boolean {
		return true;
	}

	getCell(coord: GridCoord2): T | undefined {
		return this.cells.get(infiniteGrid2Key_(coord));
	}

	*getCells(): IterableIterator<[GridCoord2, T]> {
		for (const [key, value] of this.cells) {
			const commaIndex = key.indexOf(",");
			yield [
				{
					col: Number(key.slice(0, commaIndex)),
					row: Number(key.slice(commaIndex + 1)),
				},
				value,
			];
		}
	}

	setCell(coord: GridCoord2, value: T): void {
		(this.cells as Map<string, T>).set(infiniteGrid2Key_(coord), value);
	}
}

function infiniteGrid2Key_(coord: GridCoord2): string {
	return `${coord.col},${coord.row}`;
}
