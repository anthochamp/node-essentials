import type { ICollection } from "../collection/icollection.js";

/**
 * A collection with caller-supplied equality and set algebra.
 *
 * Method names deliberately mirror the native `Set` (`union`, `intersection`,
 * `difference`, `symmetricDifference`, `isSubsetOf`, `isSupersetOf`,
 * `isDisjointFrom`), so the only thing a caller has to learn is what this adds:
 * caller-supplied equality. Native `Set` is locked to `SameValueZero`, which is
 * the actual reason this type is wanted.
 *
 * The set-algebra members are implemented here, not delegated to
 * `@ac-kit/algo`'s free functions of the same names: those are built on native
 * `Set` and so are locked to `SameValueZero` themselves, which is precisely
 * what an implementation of this interface has to escape.
 */
export interface ISet<T> extends ICollection<T> {
	add(item: T): void;

	/** Takes an `Iterable` so another set can be added without materialising it. */
	addAll(items: Iterable<T>): void;

	delete(item: T): boolean;
	has(item: T): boolean;

	union(other: Iterable<T>): ISet<T>;
	intersection(other: Iterable<T>): ISet<T>;
	difference(other: Iterable<T>): ISet<T>;
	symmetricDifference(other: Iterable<T>): ISet<T>;
	isSubsetOf(other: Iterable<T>): boolean;
	isSupersetOf(other: Iterable<T>): boolean;
	isDisjointFrom(other: Iterable<T>): boolean;
}
