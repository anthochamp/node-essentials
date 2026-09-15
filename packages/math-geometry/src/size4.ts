export type Size4 = {
	width: number;
	height: number;
	depth: number;
	duration: number;
};

/** Exact equality. */
export function size4Equals(a: Size4, b: Size4): boolean {
	return (
		a.width === b.width &&
		a.height === b.height &&
		a.depth === b.depth &&
		a.duration === b.duration
	);
}

export function size4Scale(size: Size4, factor: number): Size4 {
	return {
		width: size.width * factor,
		height: size.height * factor,
		depth: size.depth * factor,
		duration: size.duration * factor,
	};
}
