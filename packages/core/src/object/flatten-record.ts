import { isPojo } from "../guards/is-pojo.js";
import { setRecordEntry } from "./set-record-entry.js";

export type FlattenRecordOptions = {
	/**
	 * Separator joining the segments of an output key. Default `"."`.
	 *
	 * Must not be empty: `unflattenRecord` splits on it, and splitting on `""`
	 * would take every key apart character by character.
	 */
	readonly delimiter?: string | null;

	/**
	 * Descends into arrays, numbering their elements. Default `false`, which
	 * leaves an array whole as a leaf value.
	 *
	 * Off by default because an index is the one segment a flattened key cannot
	 * tell apart from an ordinary key spelled `"0"`, so numbering costs the round
	 * trip its only ambiguity-free case.
	 */
	readonly flattenArrays?: boolean | null;

	/**
	 * Greatest number of segments an output key may have. Default: unbounded.
	 *
	 * A value below that depth is copied across whole, still nested. `1` copies
	 * the record's own entries without flattening anything.
	 */
	readonly maxDepth?: number | null;
};

type Resolved_ = {
	readonly delimiter: string;
	readonly flattenArrays: boolean;
	readonly maxDepth: number;
};

/** An empty container has no entry to name, so flattening it would lose the key. */
function isDescendable_(value: unknown, options: Resolved_): boolean {
	if (Array.isArray(value)) {
		return options.flattenArrays && value.length > 0;
	}

	return isPojo(value) && Object.keys(value).length > 0;
}

function step_(
	source: Readonly<Record<string, unknown>>,
	prefix: string | null,
	depth: number,
	output: Record<string, unknown>,
	options: Resolved_,
): void {
	// Own keys only: `for...in` would walk a hostile source's prototype too.
	for (const key of Object.keys(source)) {
		const value = source[key];
		// `null` rather than `""` for the root: a top-level key may itself be empty.
		const outputKey = prefix === null ? key : prefix + options.delimiter + key;

		if (depth < options.maxDepth && isDescendable_(value, options)) {
			step_(
				value as Readonly<Record<string, unknown>>,
				outputKey,
				depth + 1,
				output,
				options,
			);
		} else {
			setRecordEntry(output, outputKey, value);
		}
	}
}

/**
 * Collapse a nested record into a one-level one, naming each leaf by the
 * delimiter-joined path that reached it.
 *
 * A leaf is anything that is not a plain object — a `Date`, a `Map`, a class
 * instance and, by default, an array are all copied across whole. So is an
 * empty plain object, which has no entry to name and would otherwise vanish.
 *
 * **A key that contains the delimiter is not escaped.** `{ "a.b": 1 }` flattens
 * to `{ "a.b": 1 }`, exactly as `{ a: { b: 1 } }` does, and
 * {@link unflattenRecord} reads both back as `{ a: { b: 1 } }` — the delimiter
 * always wins over a literal occurrence of it. Two inputs colliding onto one
 * output key leave the last one written, in `Object.keys` order. Pick a
 * delimiter the keys cannot contain when the round trip has to hold.
 *
 * Keys are written with `setRecordEntry`, so an input key named `__proto__`
 * becomes an own entry of the result instead of reaching the prototype setter.
 *
 * Time is linear in the number of nodes visited, plus the cost of building the
 * keys, which is the total length of the output's keys. Memory is the output
 * record plus one stack frame per level of nesting, so a record nested deeper
 * than the engine's stack overflows rather than degrading.
 *
 * @example
 * 	```ts
 * 	flattenRecord({ key1: { keyA: "v" }, key2: { a: { b: 2 } } });
 * 	// { "key1.keyA": "v", "key2.a.b": 2 }
 *
 * 	flattenRecord({ host: { tags: ["a", "b"] } });
 * 	// { "host.tags": ["a", "b"] } — an array is a leaf
 *
 * 	flattenRecord({ a: { b: { c: 1 } } }, { delimiter: "/", maxDepth: 2 });
 * 	// { "a/b": { c: 1 } }
 * 	```;
 *
 * @param source The record to flatten; it is not modified.
 * @param options Delimiter, array handling and depth cap.
 * @returns A new one-level record.
 * @throws RangeError If the delimiter is empty or `maxDepth` is below 1.
 */
export function flattenRecord(
	source: Readonly<Record<string, unknown>>,
	options?: FlattenRecordOptions,
): Record<string, unknown> {
	const resolved: Resolved_ = {
		delimiter: options?.delimiter ?? ".",
		flattenArrays: options?.flattenArrays ?? false,
		maxDepth: options?.maxDepth ?? Number.POSITIVE_INFINITY,
	};

	if (resolved.delimiter.length === 0) {
		throw new RangeError("flattenRecord: delimiter must not be empty");
	}
	// Negated so a `NaN` depth is rejected rather than silently flattening nothing.
	if (!(resolved.maxDepth >= 1)) {
		throw new RangeError("flattenRecord: maxDepth must be at least 1");
	}

	const output: Record<string, unknown> = {};
	step_(source, null, 1, output, resolved);
	return output;
}
