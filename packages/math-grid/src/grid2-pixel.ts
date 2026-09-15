import type { Rect2 } from "@ac-kit/math-geometry";
import { Point2, Size2 } from "@ac-kit/math-geometry";

import { GridCoord2 } from "./grid-coord2.js";
import { GridRect2 } from "./grid-rect2.js";
import { GridSize2 } from "./grid-size2.js";

// ─── Structural (unit) conversions ────────────────────────────────────────────
//
// Convention: col = x, row = y, cols = width, rows = height.
// These conversions are exact (integer-preserving) field remappings.

export function gridCoord2ToPoint2(coord: GridCoord2): Point2 {
	return { x: coord.col, y: coord.row };
}

export function point2ToGridCoord2(point: Point2): GridCoord2 {
	return { col: point.x, row: point.y };
}

export function gridSize2ToSize2(size: GridSize2): Size2 {
	return { width: size.cols, height: size.rows };
}

export function size2ToGridSize2(size: Size2): GridSize2 {
	return { cols: size.width, rows: size.height };
}

export function gridRect2ToRect2(rect: GridRect2): Rect2 {
	return {
		origin: gridCoord2ToPoint2(rect.start),
		size: gridSize2ToSize2(rect.span),
	};
}

export function rect2ToGridRect2(rect: Rect2): GridRect2 {
	return {
		start: point2ToGridCoord2(rect.origin),
		span: size2ToGridSize2(rect.size),
	};
}

// ─── Scaled (pixel) conversions ───────────────────────────────────────────────
//
// `cellSize` is the pixel dimensions of one grid cell.
// Inverse (pixel→grid) returns exact (non-integer) values — round at the call site.

export function gridCoord2ToPixelPoint2(
	coord: GridCoord2,
	cellSize: Size2,
): Point2 {
	return { x: coord.col * cellSize.width, y: coord.row * cellSize.height };
}

export function gridSize2ToPixelSize2(size: GridSize2, cellSize: Size2): Size2 {
	return {
		width: size.cols * cellSize.width,
		height: size.rows * cellSize.height,
	};
}

export function gridRect2ToPixelRect2(rect: GridRect2, cellSize: Size2): Rect2 {
	return {
		origin: gridCoord2ToPixelPoint2(rect.start, cellSize),
		size: gridSize2ToPixelSize2(rect.span, cellSize),
	};
}

export function pixelPoint2ToGridCoord2(
	point: Point2,
	cellSize: Size2,
): GridCoord2 {
	return { col: point.x / cellSize.width, row: point.y / cellSize.height };
}

export function pixelSize2ToGridSize2(size: Size2, cellSize: Size2): GridSize2 {
	return {
		cols: size.width / cellSize.width,
		rows: size.height / cellSize.height,
	};
}

export function pixelRect2ToGridRect2(rect: Rect2, cellSize: Size2): GridRect2 {
	return {
		start: pixelPoint2ToGridCoord2(rect.origin, cellSize),
		span: pixelSize2ToGridSize2(rect.size, cellSize),
	};
}
