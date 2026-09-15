import BTreeExport from "sorted-btree";

/** The subset of `sorted-btree`'s surface the ordered-set suites use. */
type BTreeLike = {
	set(key: number, value: boolean): boolean;
	has(key: number): boolean;
	readonly size: number;
};

/**
 * `sorted-btree` declares `export default` in a `.d.ts` that NodeNext resolves
 * as CommonJS, so the default import lands on the namespace object rather than
 * the class. Unwrapping it here keeps the workaround in one place instead of in
 * every suite that compares against it.
 */
export const BTree = ((BTreeExport as unknown as { default?: unknown })
	.default ?? BTreeExport) as new () => BTreeLike;
