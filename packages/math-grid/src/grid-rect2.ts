import { GridCoord2, gridCoord2Equals } from "./grid-coord2.js";
import { GridSize2, gridSize2Equals } from "./grid-size2.js";

export type GridRect2 = {
	start: GridCoord2;
	span: GridSize2;
};

export function gridRect2ContainsCoord(
	rect: GridRect2,
	coord: GridCoord2,
): boolean {
	return (
		coord.row >= rect.start.row &&
		coord.row < rect.start.row + rect.span.rows &&
		coord.col >= rect.start.col &&
		coord.col < rect.start.col + rect.span.cols
	);
}

export function gridRect2ContainsRect(
	container: GridRect2,
	contained: GridRect2,
): boolean {
	return (
		contained.start.row >= container.start.row &&
		contained.start.col >= container.start.col &&
		contained.start.row + contained.span.rows <=
			container.start.row + container.span.rows &&
		contained.start.col + contained.span.cols <=
			container.start.col + container.span.cols
	);
}

/**
 * Returns the exclusive end coordinate (one past the last cell in each
 * dimension).
 */
export function gridRect2End(rect: GridRect2): GridCoord2 {
	return {
		row: rect.start.row + rect.span.rows,
		col: rect.start.col + rect.span.cols,
	};
}

export function gridRect2Equals(a: GridRect2, b: GridRect2): boolean {
	return gridCoord2Equals(a.start, b.start) && gridSize2Equals(a.span, b.span);
}

export function gridRect2Intersects(a: GridRect2, b: GridRect2): boolean {
	return !(
		a.start.row + a.span.rows <= b.start.row ||
		b.start.row + b.span.rows <= a.start.row ||
		a.start.col + a.span.cols <= b.start.col ||
		b.start.col + b.span.cols <= a.start.col
	);
}

export function gridRect2Translate(
	rect: GridRect2,
	offset: GridCoord2,
): GridRect2 {
	return {
		start: {
			row: rect.start.row + offset.row,
			col: rect.start.col + offset.col,
		},
		span: rect.span,
	};
}
