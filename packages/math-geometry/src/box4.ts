import { Point4, point4Equals } from "./point4.js";
import { Size4, size4Equals } from "./size4.js";

export type Box4 = {
	origin: Point4;
	size: Size4;
};

/** Exact equality of origin and size. */
export function box4Equals(a: Box4, b: Box4): boolean {
	return point4Equals(a.origin, b.origin) && size4Equals(a.size, b.size);
}
