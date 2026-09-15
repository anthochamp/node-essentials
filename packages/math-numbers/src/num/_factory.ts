// Internal module — singleton registry mapping type tags to converter functions.
// Each concrete numeric type registers itself when its module is loaded.

import { INum } from "./inum.js";

/**
 * A function that converts an arbitrary value to type `T`, or `null` on
 * failure.
 */
export type NumConverter<T> = (
	value: INum | number | bigint | string,
) => T | null;

// ---------------------------------------------------------------------------
// Module-level singleton state
// ---------------------------------------------------------------------------

const _converters: Map<symbol, NumConverter<unknown>> = new Map();

/**
 * Registers a converter for the given type tag. Called once per concrete
 * numeric type at module load time.
 */
export function registerConverter<T>(
	tag: symbol,
	converter: NumConverter<T>,
): void {
	_converters.set(tag, converter as NumConverter<unknown>);
}

/**
 * Converts `value` to the type identified by `tag`. Returns `null` if no
 * converter is registered or the conversion fails.
 */
export function convert<T>(tag: symbol, value: unknown): T | null {
	const converter = _converters.get(tag);
	if (converter === undefined) return null;
	return converter(value as INum | number | bigint | string) as T | null;
}

/**
 * Converts `value` to the type identified by `tag`.
 *
 * @throws {RangeError} When no converter is registered or the conversion fails.
 */
export function convertOrThrow<T>(tag: symbol, value: unknown): T {
	const result = convert<T>(tag, value);
	if (result === null) {
		throw new RangeError(
			`Cannot convert to numeric type ${String(tag)}: ${String(value)}`,
		);
	}
	return result;
}
