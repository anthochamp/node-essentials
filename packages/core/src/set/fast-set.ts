import { isPropertyKey } from "../guards/is-property-key.js";

/**
 * A {@link Set}-like container that routes {@link PropertyKey} elements (string,
 * number, symbol) to a null-prototype plain object and all other elements to a
 * native {@link Set}.
 *
 * V8 stores integer-keyed properties on a null-prototype object as a packed C++
 * elements array, making membership checks significantly faster than a
 * hash-table-backed {@link Set} for bounded numeric ranges.
 */
export class FastSet<T> /*implements Pick<Set<T>, "has" | "add"> */ {
	private hash: Record<PropertyKey, true> | undefined;
	private set: Set<T> | undefined;

	constructor(iterable?: Iterable<T>) {
		if (iterable !== undefined) {
			for (const value of iterable) {
				this.add(value);
			}
		}
	}

	has(value: T): boolean {
		if (isPropertyKey(value)) {
			return this.hash?.[value] !== undefined;
		}

		return this.set?.has(value) ?? false;
	}

	add(value: T): FastSet<T> {
		if (isPropertyKey(value)) {
			(this.hash ??= Object.create(null) as Record<PropertyKey, true>)[value] =
				true;
		} else {
			(this.set ??= new Set<T>()).add(value);
		}

		return this;
	}
}
