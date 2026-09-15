import { Vec2 } from "@ac-kit/math-linear";

import {
	type Point2,
	point2Clamp,
	point2Equals,
	point2Lerp,
	point2Max,
	point2Min,
	point2Translate,
} from "./point2.js";
import {
	type Size2,
	size2Clamp,
	size2Equals,
	size2Lerp,
	size2Scale,
	size2ScaleToFit,
} from "./size2.js";

export type Rect2<T extends bigint | number | string | null = number> = {
	origin: Point2<T>;
	size: Size2<T>;
};

export type RectLtrb<T extends bigint | number | string | null = number> = {
	left: T;
	top: T;
	right: T;
	bottom: T;
};

export function rect2Equals(a: Rect2, b: Rect2): boolean {
	return point2Equals(a.origin, b.origin) && size2Equals(a.size, b.size);
}

export function rect2Bottom(rect: Rect2): number {
	return rect.origin.y + rect.size.height;
}

export function rect2Right(rect: Rect2): number {
	return rect.origin.x + rect.size.width;
}

export function rect2BottomRight(rect: Rect2): Point2 {
	return {
		x: rect2Right(rect),
		y: rect2Bottom(rect),
	};
}

export function rect2ToLtrb(rect: Rect2): RectLtrb {
	return {
		left: rect.origin.x,
		top: rect.origin.y,
		right: rect2Right(rect),
		bottom: rect2Bottom(rect),
	};
}

export function ltrbToRect2(ltrb: RectLtrb): Rect2 {
	return {
		origin: { x: ltrb.left, y: ltrb.top },
		size: { width: ltrb.right - ltrb.left, height: ltrb.bottom - ltrb.top },
	};
}

export function rect2Center(rect: Rect2): Point2 {
	return {
		x: rect.origin.x + rect.size.width / 2,
		y: rect.origin.y + rect.size.height / 2,
	};
}

export function rect2ContainsPoint(rect: Rect2, point: Point2): boolean {
	return (
		point.x >= rect.origin.x &&
		point.x <= rect.origin.x + rect.size.width &&
		point.y >= rect.origin.y &&
		point.y <= rect.origin.y + rect.size.height
	);
}

export function rect2Contains(container: Rect2, contained: Rect2): boolean {
	return (
		contained.origin.x >= container.origin.x &&
		contained.origin.x + contained.size.width <=
			container.origin.x + container.size.width &&
		contained.origin.y >= container.origin.y &&
		contained.origin.y + contained.size.height <=
			container.origin.y + container.size.height
	);
}

export function rect2Intersect(a: Rect2, b: Rect2): boolean {
	return !(
		a.origin.x + a.size.width < b.origin.x ||
		b.origin.x + b.size.width < a.origin.x ||
		a.origin.y + a.size.height < b.origin.y ||
		b.origin.y + b.size.height < a.origin.y
	);
}

/**
 * Calculates the intersection of two rectangles. If they do not intersect,
 * returns null.
 */
export function rect2Intersection(a: Rect2, b: Rect2): Rect2 | null {
	if (!rect2Intersect(a, b)) {
		return null;
	}

	const origin = point2Max(a.origin, b.origin);
	const width =
		Math.min(a.origin.x + a.size.width, b.origin.x + b.size.width) - origin.x;
	const height =
		Math.min(a.origin.y + a.size.height, b.origin.y + b.size.height) - origin.y;

	return { origin, size: { width, height } };
}

/** Creates a new rectangle that encompasses both input rectangles. */
export function rect2Union(a: Rect2, b: Rect2): Rect2 {
	const origin = point2Min(a.origin, b.origin);
	const width =
		Math.max(a.origin.x + a.size.width, b.origin.x + b.size.width) - origin.x;
	const height =
		Math.max(a.origin.y + a.size.height, b.origin.y + b.size.height) - origin.y;

	return { origin, size: { width, height } };
}

export function rect2Translate(rect: Rect2, offset: Vec2): Rect2 {
	return {
		origin: {
			x: rect.origin.x + offset[0],
			y: rect.origin.y + offset[1],
		},
		size: rect.size,
	};
}

/**
 * Creates a new rectangle that is inflated by the specified amount in all
 * directions. The amount can be positive (to expand the rectangle) or negative
 * (to shrink it).
 */
export function rect2Inflate(rect: Rect2, amount: number): Rect2 {
	return {
		origin: {
			x: rect.origin.x - amount,
			y: rect.origin.y - amount,
		},
		size: {
			width: rect.size.width + 2 * amount,
			height: rect.size.height + 2 * amount,
		},
	};
}

/**
 * Creates a new rectangle that is inset by the specified amounts from the
 * original rectangle's edges.
 */
export function rect2Inset(rect: Rect2, dx: number, dy: number): Rect2 {
	return {
		origin: { x: rect.origin.x + dx, y: rect.origin.y + dy },
		size: {
			width: rect.size.width - 2 * dx,
			height: rect.size.height - 2 * dy,
		},
	};
}

/**
 * Creates a new rectangle that is clamped within the bounds of the specified
 * minimum and maximum rectangles.
 */
export function rect2Clamp(rect: Rect2, min: Rect2, max: Rect2): Rect2 {
	return {
		origin: point2Clamp(rect.origin, min.origin, max.origin),
		size: size2Clamp(rect.size, min.size, max.size),
	};
}

export function rect2Lerp(a: Rect2, b: Rect2, t: number): Rect2 {
	return {
		origin: point2Lerp(a.origin, b.origin, t),
		size: size2Lerp(a.size, b.size, t),
	};
}

/**
 * Fits the contained rectangle inside the container rectangle while maintaining
 * the aspect ratio of the contained rectangle.
 */
export function rect2FitInside(container: Rect2, contained: Rect2): Rect2 {
	const scale = size2ScaleToFit(container.size, contained.size);

	const newSize = size2Scale(contained.size, scale);

	const offset = [
		(container.size.width - newSize.width) / 2,
		(container.size.height - newSize.height) / 2,
	] as const satisfies Vec2;

	return {
		origin: point2Translate(container.origin, offset),
		size: newSize,
	};
}
