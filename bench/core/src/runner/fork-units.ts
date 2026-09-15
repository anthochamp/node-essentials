import { BenchCase, BenchCondition } from "./registry.js";

/**
 * One executable unit: a condition with no nested condition of its own,
 * together with the enclosing conditions whose hooks wrap it and the full case
 * list it runs.
 *
 * Only such a leaf is executed. A condition that declares nested conditions
 * contributes its hooks and_its cases to each of them instead of running on its
 * own.
 */
export type ForkUnit = {
	condition: BenchCondition;

	/** Enclosing conditions, outermost first. Empty for a root condition. */
	ancestors: BenchCondition[];

	/** Entry indices from the roots down to {@link ForkUnit.condition}. */
	path: number[];

	/** Titles along {@link ForkUnit.path}, the fork unit's own last. */
	titles: string[];

	/** Every case this unit runs, ancestors' included, in reading order. */
	cases: BenchCase[];
};

/**
 * Walks `roots` depth-first and returns every executable leaf.
 *
 * A leaf's case list is assembled in reading order: at each enclosing level,
 * the cases declared _above_ the nested condition being descended into come
 * first, then that condition's own list, then the cases declared _below_ it. So
 * sibling leaves of one parent see the parent's cases split around their own
 * declaration point, exactly as the file reads.
 */
export function collectForkUnits(roots: readonly BenchCondition[]): ForkUnit[] {
	const units: ForkUnit[] = [];

	const visit = (
		condition: BenchCondition,
		ancestors: readonly BenchCondition[],
		path: readonly number[],
		titles: readonly string[],
	): void => {
		const chain = [...ancestors, condition];
		let leaf = true;

		for (const [index, entry] of condition.entries.entries()) {
			if (entry.kind === "condition") {
				leaf = false;
				visit(
					entry.condition,
					chain,
					[...path, index],
					[...titles, entry.condition.title],
				);
			}
		}

		if (!leaf) {
			return;
		}

		const cases = assembleForkUnitCases(chain, path);

		if (cases.length > 0) {
			units.push({
				condition,
				ancestors: [...ancestors],
				path: [...path],
				titles: [...titles],
				cases,
			});
		}
	};

	for (const [index, root] of roots.entries()) {
		visit(root, [], [index], [root.title]);
	}

	return units;
}

/**
 * Assembles a fork unit's case list in reading order.
 *
 * `chain` runs outermost-first; every `path` entry after the first indexes the
 * nested condition that level descended into, so an enclosing level's cases
 * split around it.
 */
export function assembleForkUnitCases(
	chain: readonly BenchCondition[],
	path: readonly number[],
): BenchCase[] {
	const leaf = chain[chain.length - 1];

	if (leaf === undefined) {
		return [];
	}

	const before: BenchCase[] = [];
	const after: BenchCase[] = [];

	for (const [level, condition] of chain.slice(0, -1).entries()) {
		const descentIndex = path[level + 1] ?? condition.entries.length;

		for (const [index, entry] of condition.entries.entries()) {
			if (entry.kind !== "case") {
				continue;
			}

			(index < descentIndex ? before : after).push(entry.case);
		}
	}

	return [
		...before,
		...leaf.entries
			.filter((entry) => entry.kind === "case")
			.map((entry) => entry.case),
		...after,
	];
}
