import type { Callable } from "../types/callable.js";

/**
 * Decides which value survives when two maps carry the same key.
 *
 * Receives the key, the value already accumulated, and the one arriving from a
 * later map.
 */
export type MappingConflictResolver<K, V> = Callable<
	[key: K, existing: V, incoming: V],
	V
>;

/**
 * Merges several maps into one, resolving repeated keys with a stated rule.
 *
 * `resolveConflict` is required rather than defaulted, because the default
 * everyone reaches for — `new Map([...a, ...b])` — silently keeps the last
 * write, and a silent default is the bug this exists to prevent. Pass `(_key,
 * _existing, incoming) => incoming` to ask for it deliberately.
 *
 * Insertion order follows first appearance: a key repeated in a later map keeps
 * the position it was first given, only its value changes.
 *
 * Time complexity: O(total entries).
 *
 * @param maps The maps to merge, in precedence order.
 * @param resolveConflict Called once per repeated key, with the accumulated
 *   value and the incoming one.
 * @returns A new map. The inputs are not modified.
 */
export function joinMappings<K, V>(
	maps: Iterable<ReadonlyMap<K, V>>,
	resolveConflict: MappingConflictResolver<K, V>,
): Map<K, V> {
	const joined = new Map<K, V>();

	for (const map of maps) {
		for (const [key, value] of map) {
			const existing = joined.get(key);

			joined.set(
				key,
				existing === undefined && !joined.has(key)
					? value
					: resolveConflict(key, existing as V, value),
			);
		}
	}

	return joined;
}
