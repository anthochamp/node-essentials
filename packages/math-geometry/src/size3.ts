import { lerp } from "@ac-kit/math-scalar";

export type Size3<T extends bigint | number | string | null = number> = {
	width: T;
	height: T;
	depth: T;
};

export function size3Clamp(size: Size3, min: Size3, max: Size3): Size3 {
	return {
		width: Math.max(min.width, Math.min(max.width, size.width)),
		height: Math.max(min.height, Math.min(max.height, size.height)),
		depth: Math.max(min.depth, Math.min(max.depth, size.depth)),
	};
}

/** Exact equality. */
export function size3Equals(a: Size3, b: Size3): boolean {
	return a.width === b.width && a.height === b.height && a.depth === b.depth;
}

export function size3Lerp(a: Size3, b: Size3, t: number): Size3 {
	return {
		width: lerp(a.width, b.width, t),
		height: lerp(a.height, b.height, t),
		depth: lerp(a.depth, b.depth, t),
	};
}

export function size3Max(a: Size3, b: Size3): Size3 {
	return {
		width: Math.max(a.width, b.width),
		height: Math.max(a.height, b.height),
		depth: Math.max(a.depth, b.depth),
	};
}

export function size3Min(a: Size3, b: Size3): Size3 {
	return {
		width: Math.min(a.width, b.width),
		height: Math.min(a.height, b.height),
		depth: Math.min(a.depth, b.depth),
	};
}

export function size3Round(size: Size3): Size3 {
	return {
		width: Math.round(size.width),
		height: Math.round(size.height),
		depth: Math.round(size.depth),
	};
}

export function size3Scale(size: Size3, factor: number): Size3 {
	return {
		width: size.width * factor,
		height: size.height * factor,
		depth: size.depth * factor,
	};
}

/**
 * Returns the uniform scale factor needed to fit `contained` inside
 * `container`, preserving aspect ratio (the smallest of the three axis
 * ratios).
 */
export function size3ScaleToFit(container: Size3, contained: Size3): number {
	return Math.min(
		container.width / contained.width,
		container.height / contained.height,
		container.depth / contained.depth,
	);
}

export function size3Volume(size: Size3): number {
	return size.width * size.height * size.depth;
}
