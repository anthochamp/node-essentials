import { DefinedValue } from "@ac-kit/core";

/** Union-find over items of type `T`. */
export interface IDisjointSet<T extends DefinedValue = DefinedValue> {
	setCount(): number;
	makeSet(item: T): void;
	makeSets(items: Iterable<T>): void;
	find(item: T): T | undefined;
	union(a: T, b: T): boolean;
	connected(a: T, b: T): boolean;
}
