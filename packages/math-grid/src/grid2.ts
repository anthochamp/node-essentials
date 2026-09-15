import { GridCoord2 } from "./grid-coord2.js";
import { GridRect2 } from "./grid-rect2.js";

/**
 * Abstract base class for all 2D grids. Subclasses implement getCell, contains,
 * and setCell; canPlaceRect, placeRect, and getRectNeighbors are provided
 * here.
 */
export abstract class Grid2<T> {
	abstract getCell(coord: GridCoord2): T | undefined;
	abstract contains(coord: GridCoord2): boolean;
	abstract setCell(coord: GridCoord2, value: T): void;

	canPlaceRect(rect: GridRect2): boolean {
		if (
			!this.contains(rect.start) ||
			!this.contains({
				row: rect.start.row + rect.span.rows - 1,
				col: rect.start.col + rect.span.cols - 1,
			})
		) {
			return false;
		}
		for (let dr = 0; dr < rect.span.rows; dr++) {
			for (let dc = 0; dc < rect.span.cols; dc++) {
				if (
					this.getCell({
						row: rect.start.row + dr,
						col: rect.start.col + dc,
					}) !== undefined
				) {
					return false;
				}
			}
		}
		return true;
	}

	placeRect(rect: GridRect2, value: T): void {
		for (let dr = 0; dr < rect.span.rows; dr++) {
			for (let dc = 0; dc < rect.span.cols; dc++) {
				this.setCell(
					{ row: rect.start.row + dr, col: rect.start.col + dc },
					value,
				);
			}
		}
	}

	getRectNeighbors(rect: GridRect2): Set<T> {
		const neighbors = new Set<T>();
		const addIfPresent_ = (coord: GridCoord2) => {
			if (this.contains(coord)) {
				const value = this.getCell(coord);
				if (value !== undefined) {
					neighbors.add(value);
				}
			}
		};
		for (let dr = 0; dr < rect.span.rows; dr++) {
			const row = rect.start.row + dr;
			addIfPresent_({ row, col: rect.start.col - 1 });
			addIfPresent_({ row, col: rect.start.col + rect.span.cols });
		}
		for (let dc = 0; dc < rect.span.cols; dc++) {
			const col = rect.start.col + dc;
			addIfPresent_({ row: rect.start.row - 1, col });
			addIfPresent_({ row: rect.start.row + rect.span.rows, col });
		}
		return neighbors;
	}
}
