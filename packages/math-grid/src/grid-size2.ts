export type GridSize2 = {
	rows: number;
	cols: number;
};

export function gridSize2Area(size: GridSize2): number {
	return size.rows * size.cols;
}

export function gridSize2Equals(a: GridSize2, b: GridSize2): boolean {
	return a.rows === b.rows && a.cols === b.cols;
}

export function gridSize2Scale(size: GridSize2, factor: number): GridSize2 {
	return { rows: size.rows * factor, cols: size.cols * factor };
}
