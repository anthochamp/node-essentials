import {
	INTEGER_INTERVAL_STEP,
	complementIntervals,
	intersectIntervals,
	isInSortedIntervals,
	mergeIntervals,
	subtractIntervals,
} from "@ac-kit/algo";
import { compareNaturalAscending } from "@ac-kit/core";

/**
 * Sets of UTF-16 code units, as sorted, disjoint, non-adjacent inclusive
 * ranges, flat: `[from, to, from, to, …]`.
 *
 * Matching in this package is by code unit rather than by code point, matching
 * `@ac-kit/format-regex` and a native `RegExp` without the `u` flag, so an
 * astral character is two members of the universe rather than one.
 *
 * Ranges rather than a bitset because the Pike-VM backend has to determinise a
 * complement, and determinising means splitting the alphabet at every class
 * boundary — a range list is already that list of boundaries. Flat rather than
 * one object per range because that is `@ac-kit/algo`'s interval form, so every
 * operation below is one of that package's with the universe and the integer
 * successor bound in.
 */
export type CharSet = readonly number[];

/** The largest code unit; the universe is `0 … MAX_CODE_UNIT`. */
export const MAX_CODE_UNIT = 0xffff;

/** Every code unit. */
export const FULL_CHAR_SET: CharSet = [0, MAX_CODE_UNIT];

/** No code unit. */
export const EMPTY_CHAR_SET: CharSet = [];

const UNIVERSE_: readonly [number, number] = [0, MAX_CODE_UNIT];

/** Code units are integers, so `9` and `10` leave nothing between them. */
const isAdjacent_ = (end: number, nextStart: number): boolean =>
	nextStart === end + 1;

/**
 * Sorts, merges and drops empty ranges. O(n log n) in the range count.
 *
 * Adjacent ranges coalesce as well as overlapping ones: code units are
 * integers, so `0-9` and `10-19` describe one span and leaving them apart would
 * make two equal sets produce different {@link charSetKey}s. An inverted range
 * covers nothing and is dropped — which is what a `[z-a]` class has to become.
 */
export function normalizeCharSet(bounds: readonly number[]): CharSet {
	return mergeIntervals(bounds, compareNaturalAscending<number>, isAdjacent_);
}

/** The set holding exactly the code units of `text`. */
export function charSetOfChars(text: string): CharSet {
	const bounds: number[] = [];
	for (let index = 0; index < text.length; index++) {
		const code = text.charCodeAt(index);
		bounds.push(code, code);
	}
	return normalizeCharSet(bounds);
}

/** The set holding the one code unit at index 0 of `char`. */
export function charSetOfChar(char: string): CharSet {
	const code = char.charCodeAt(0);
	return [code, code];
}

/** Union. O(n log n) in the total range count. */
export function unionCharSets(...sets: readonly CharSet[]): CharSet {
	return normalizeCharSet(sets.flat());
}

/** Everything the set does not hold. O(n) in the range count. */
export function complementCharSet(set: CharSet): CharSet {
	return complementIntervals(
		set,
		UNIVERSE_,
		compareNaturalAscending,
		INTEGER_INTERVAL_STEP,
	);
}

/** Intersection. O(n + m) in the range counts. */
export function intersectCharSets(left: CharSet, right: CharSet): CharSet {
	return intersectIntervals(left, right, compareNaturalAscending);
}

/** `left` without `right`. O(n + m) in the range counts. */
export function differenceCharSets(left: CharSet, right: CharSet): CharSet {
	return subtractIntervals(
		left,
		right,
		compareNaturalAscending,
		INTEGER_INTERVAL_STEP,
	);
}

export function isEmptyCharSet(set: CharSet): boolean {
	return set.length === 0;
}

/** Whether `set` holds `code`. O(log n) in the range count. */
export function charSetHas(set: CharSet, code: number): boolean {
	return isInSortedIntervals(set, code, compareNaturalAscending);
}

/** The predicate a `@ac-kit/format-regex` `predicate` instruction wants. */
export function charSetPredicate(set: CharSet): (char: string) => boolean {
	return (char) => charSetHas(set, char.charCodeAt(0));
}

/** How many code units the set holds. */
export function charSetSize(set: CharSet): number {
	let total = 0;
	for (let index = 0; index < set.length; index += 2) {
		total += set[index + 1]! - set[index]! + 1;
	}
	return total;
}

/** A stable key, so two equal sets share one entry in a map. */
export function charSetKey(set: CharSet): string {
	return set.join(",");
}

/**
 * ECMA-262 `Canonicalize` for a non-Unicode-mode `RegExp` with the `i` flag:
 * upper-case unless that changes the length, and never fold a non-ASCII code
 * unit onto an ASCII one.
 */
function canonicalize_(code: number): number {
	const upper = String.fromCharCode(code).toUpperCase();
	if (upper.length !== 1) {
		return code;
	}
	const folded = upper.charCodeAt(0);
	return code >= 128 && folded < 128 ? code : folded;
}

let caseGroups_: Map<number, number[]> | undefined;

/** Every code unit sharing a canonical form, built once on first use. */
function caseGroups(): Map<number, number[]> {
	if (caseGroups_ === undefined) {
		caseGroups_ = new Map();
		for (let code = 0; code <= MAX_CODE_UNIT; code++) {
			const canonical = canonicalize_(code);
			const group = caseGroups_.get(canonical);
			if (group === undefined) {
				caseGroups_.set(canonical, [code]);
			} else {
				group.push(code);
			}
		}
	}
	return caseGroups_;
}

/**
 * The set closed under case, matching what the `i` flag does to a native
 * `RegExp`.
 *
 * O(code units in the set), so it is applied to literals and explicit classes
 * only — a wildcard's set is already closed under case, since `/` and `\n` have
 * no case variants.
 */
export function expandCharSetCaseInsensitive(set: CharSet): CharSet {
	const groups = caseGroups();
	const bounds: number[] = [...set];
	for (let index = 0; index < set.length; index += 2) {
		for (let code = set[index]!; code <= set[index + 1]!; code++) {
			const siblings = groups.get(canonicalize_(code));
			if (siblings === undefined || siblings.length === 1) {
				continue;
			}
			for (const sibling of siblings) {
				bounds.push(sibling, sibling);
			}
		}
	}
	return normalizeCharSet(bounds);
}

/**
 * Splits the universe into the coarsest intervals on which every one of `sets`
 * is constant — the alphabet a subset construction transitions over.
 *
 * O(n log n) in the total range count, and the result is at most `2n + 1`
 * intervals however many sets went in, which is why determinisation here is
 * bounded by the state count rather than by the alphabet.
 */
export function partitionAlphabet(
	sets: readonly CharSet[],
	universe: CharSet,
): CharSet[] {
	const boundaries = new Set<number>([0, MAX_CODE_UNIT + 1]);
	for (const set of [...sets, universe]) {
		for (let index = 0; index < set.length; index += 2) {
			boundaries.add(set[index]!);
			boundaries.add(set[index + 1]! + 1);
		}
	}

	const ordered = [...boundaries].sort((left, right) => left - right);
	const atoms: CharSet[] = [];
	for (let index = 0; index + 1 < ordered.length; index++) {
		const from = ordered[index]!;
		const to = ordered[index + 1]! - 1;
		if (from > MAX_CODE_UNIT || to < from) {
			continue;
		}
		const atom = intersectCharSets([from, to], universe);
		if (!isEmptyCharSet(atom)) {
			atoms.push(atom);
		}
	}
	return atoms;
}
