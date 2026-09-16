const MIN_SAFE_ = BigInt(Number.MIN_SAFE_INTEGER);
const MAX_SAFE_ = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * Check whether converting a `bigint` to a `number` is exact.
 *
 * True when the value lies within `Number.MIN_SAFE_INTEGER` and
 * `Number.MAX_SAFE_INTEGER` inclusive, which is exactly the range where
 * `Number(value)` round-trips. Outside it, `Number(value)` still succeeds and
 * still returns a finite result — it just returns the wrong one — so a caller
 * narrowing a `bigint` for presentation or arithmetic has to ask first.
 *
 * @example
 * 	```ts
 * 	bigIntIsSafeNumber(9007199254740991n); // true
 * 	bigIntIsSafeNumber(9007199254740992n); // false
 * 	```;
 *
 * @param value The value to check.
 * @returns True if `Number(value)` loses nothing.
 */
export function bigIntIsSafeNumber(value: bigint): boolean {
	return value >= MIN_SAFE_ && value <= MAX_SAFE_;
}
