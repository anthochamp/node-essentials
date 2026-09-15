import type { Comparator, EqualityComparator } from "@ac-kit/core";
import { expect } from "vitest";

/**
 * Asserts that `compare` and `equals` agree on every ordered pair drawn from
 * `values`: `compare(a, b) === 0` exactly when `equals(a, b)`.
 *
 * Both must be exact for this to hold. An approximate equality is not
 * transitive, so pairing one with an exact comparator lets a container order
 * two elements apart while a dedupe pass calls them the same — the classic
 * source of a set holding two "equal" members.
 *
 * `values` must contain no `NaN`, and no structure holding one: exact equality
 * reports `NaN !== NaN` while a total order must place `NaN` equivalent to
 * itself, so the two disagree there by design.
 */
export function expectCompareAgreesWithEquals<T>(
	values: readonly T[],
	compare: Comparator<T>,
	equals: EqualityComparator<T, T>,
): void {
	for (const a of values) {
		for (const b of values) {
			expect(
				compare(a, b) === 0,
				`compare and equals disagree on ${JSON.stringify(a)} / ${JSON.stringify(b)}`,
			).toBe(equals(a, b));
		}
	}
}
