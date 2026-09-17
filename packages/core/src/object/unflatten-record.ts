import type { PropertyPath } from "./get-at-path.js";
import { setAtPath } from "./set-at-path.js";
import { setRecordEntry } from "./set-record-entry.js";

export type UnflattenRecordOptions = {
	/**
	 * Separator the input keys are split on. Default `"."`.
	 *
	 * Must not be empty, which would take every key apart character by character.
	 */
	readonly delimiter?: string | null;

	/**
	 * Rebuilds an array wherever a segment is a canonical decimal index. Default
	 * `false`, which keeps every segment an object key.
	 *
	 * Enable it only for keys produced by {@link flattenRecord} with
	 * `flattenArrays`. A key out of untrusted input can name an index of any
	 * size, and while the sparse array that creates is cheap to hold, its
	 * `length` is the index — enough to make a later `JSON.stringify` or
	 * iteration over it unbounded work.
	 */
	readonly buildArrays?: boolean | null;
};

/** Canonical decimal, so `"01"` and `"1e2"` stay object keys. */
const INDEX_PATTERN_ = /^(?:0|[1-9]\d*)$/;

function toPath_(
	segments: readonly string[],
	buildArrays: boolean,
): PropertyPath {
	if (!buildArrays) {
		return segments;
	}

	return segments.map((segment) =>
		INDEX_PATTERN_.test(segment) ? Number(segment) : segment,
	);
}

/**
 * Rebuild a nested record from one whose keys are delimiter-joined paths — the
 * inverse of {@link flattenRecord}.
 *
 * `unflattenRecord(flattenRecord(x))` deep-equals `x` for any `x` whose keys
 * contain neither the delimiter nor, below the top level, one of the three
 * prototype-reaching names named further down. A key that does contain the
 * delimiter is indistinguishable from nesting and is split: `{ "a.b": 1 }`
 * becomes `{ a: { b: 1 } }`, whatever the input meant by it.
 *
 * Where two keys disagree about a segment's shape — `"a"` holding `1` beside
 * `"a.b"` holding `2` — the deeper key replaces the scalar with a container,
 * and the entries are applied in `Object.keys` order, so the last one wins.
 *
 * A key with two or more segments is a path walk, and one whose segments
 * include `__proto__`, `constructor` or `prototype` is dropped whole: the
 * intermediate _reads_ of such a walk reach a prototype shared with every other
 * object, before anything is assigned. A single-segment key is an ordinary leaf
 * write and is kept, stored as an own entry by `setRecordEntry` — a record of
 * environment variables should still be able to hold one named `constructor`.
 *
 * Time is linear in the total length of the input keys plus the number of
 * segments walked. Memory is the rebuilt record plus one segment array per
 * entry, which is released as each entry is written.
 *
 * @example
 * 	```ts
 * 	unflattenRecord({ "key1.keyA": "v", "key2.a.b": 2 });
 * 	// { key1: { keyA: "v" }, key2: { a: { b: 2 } } }
 *
 * 	unflattenRecord({ "hello.you.0": "x" });
 * 	// { hello: { you: { "0": "x" } } }
 *
 * 	unflattenRecord({ "hello.you.0": "x" }, { buildArrays: true });
 * 	// { hello: { you: ["x"] } }
 * 	```;
 *
 * @param source The one-level record to expand; it is not modified.
 * @param options Delimiter and array rebuilding.
 * @returns A new nested record.
 * @throws RangeError If the delimiter is empty.
 */
export function unflattenRecord(
	source: Readonly<Record<string, unknown>>,
	options?: UnflattenRecordOptions,
): Record<string, unknown> {
	const delimiter = options?.delimiter ?? ".";
	const buildArrays = options?.buildArrays ?? false;

	if (delimiter.length === 0) {
		throw new RangeError("unflattenRecord: delimiter must not be empty");
	}

	const output: Record<string, unknown> = {};

	// Own keys only: `for...in` would walk a hostile source's prototype too.
	for (const key of Object.keys(source)) {
		const segments = key.split(delimiter);

		if (segments.length === 1) {
			setRecordEntry(output, key, source[key]);
			continue;
		}

		setAtPath(output, toPath_(segments, buildArrays), source[key]);
	}

	return output;
}
