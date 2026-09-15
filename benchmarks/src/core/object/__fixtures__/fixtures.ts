/**
 * Fixtures for the object groups.
 *
 * Everything here is JSON-safe on purpose. `JSON.parse(JSON.stringify(x))` is
 * one of the contenders and `rfdc` handles only plain data by default, so a
 * fixture containing a `Map` or a `Date` would silently change what each
 * contender is being asked to do.
 */

import { randomUint32Values } from "@ac-bench/util";

export interface Node {
	id: number;
	name: string;
	enabled: boolean;
	score: number;
	tags: string[];
	meta: Record<string, number>;
	children: Node[];
}

/**
 * Builds a balanced tree of `breadth ** depth` leaves.
 *
 * @param depth Levels below the root.
 * @param breadth Children per node.
 * @returns A deterministic tree, identical for identical arguments.
 */
export function makeTree(depth: number, breadth: number): Node {
	const values = randomUint32Values(4096);
	let cursor = 0;
	const next = (): number => values[cursor++ % values.length]!;

	const build = (level: number): Node => ({
		id: next(),
		name: `node-${next().toString(36)}`,
		enabled: next() % 2 === 0,
		score: next() / 0x1_0000_0000,
		tags: [`t${next() % 100}`, `t${next() % 100}`, `t${next() % 100}`],
		meta: { a: next(), b: next(), c: next() },
		children:
			level === 0
				? []
				: Array.from({ length: breadth }, () => build(level - 1)),
	});

	return build(depth);
}

/** Counts every value visited by a full walk, used as the group's checksum. */
export function countNodes(value: unknown): number {
	if (Array.isArray(value)) {
		let total = 1;
		for (const item of value) {
			total += countNodes(item);
		}
		return total;
	}
	if (typeof value === "object" && value !== null) {
		let total = 1;
		for (const item of Object.values(value)) {
			total += countNodes(item);
		}
		return total;
	}
	return 1;
}

/**
 * Returns a copy of `tree` with one leaf field changed.
 *
 * The change is at the deepest, last position so that an equality check has to
 * traverse the whole structure before it can answer — the worst case, and the
 * only one that measures the traversal rather than the early exit.
 */
export function withDeepestChange(tree: Node): Node {
	const copy = structuredClone(tree);
	let cursor = copy;
	while (cursor.children.length > 0) {
		cursor = cursor.children.at(-1) as Node;
	}
	cursor.score = -1;
	return copy;
}
