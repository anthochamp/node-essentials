/** Substring search over one or many sequences of type `S`. */
export interface ISubstringIndex<S> {
	search(needle: S): IterableIterator<number>;
	has(needle: S): boolean;
}
