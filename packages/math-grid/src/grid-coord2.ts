import type { DistanceType } from "@ac-kit/math-linear";

export type GridCoord2 = {
	row: number;
	col: number;
};

export function gridCoord2Add(a: GridCoord2, b: GridCoord2): GridCoord2 {
	return { row: a.row + b.row, col: a.col + b.col };
}

export function gridCoord2Distance(
	a: GridCoord2,
	b: GridCoord2,
	type: DistanceType = "euclidean",
): number {
	const dr = Math.abs(a.row - b.row);
	const dc = Math.abs(a.col - b.col);
	switch (type) {
		case "manhattan":
			return dr + dc;
		case "chebyshev":
			return Math.max(dr, dc);
		case "euclidean":
			return Math.sqrt(dr * dr + dc * dc);
	}
}

export function gridCoord2Equals(a: GridCoord2, b: GridCoord2): boolean {
	return a.row === b.row && a.col === b.col;
}

export function gridCoord2Scale(coord: GridCoord2, factor: number): GridCoord2 {
	return { row: coord.row * factor, col: coord.col * factor };
}

export function gridCoord2Sub(a: GridCoord2, b: GridCoord2): GridCoord2 {
	return { row: a.row - b.row, col: a.col - b.col };
}
