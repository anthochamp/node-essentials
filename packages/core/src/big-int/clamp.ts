import { bigIntMax, bigIntMin } from "./min-max.js";

/**
 * Clamps `value` into `[min, max]` — the `bigint` sibling of {@link clamp}.
 *
 * @throws {RangeError} When `min` is greater than `max`.
 */
export function bigIntClamp(value: bigint, min: bigint, max: bigint): bigint {
	if (min > max) {
		throw new RangeError("min must not be greater than max");
	}

	return bigIntMin(bigIntMax(value, min), max);
}
