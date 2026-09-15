/**
 * A quantity's unit and scale, shared by every renderer that needs to label an
 * axis or a column without knowing what produced the numbers.
 *
 * Carries no notion of "better": nanoseconds are lower-is-better for latency
 * and higher-is-better for battery life, so direction belongs to the measured
 * quantity ({@link FieldDescriptor}), not to the dimension it is measured in.
 */
export type Unit = {
	/** Base unit symbol: `"s"`, `"B"`, `"op/s"`, `"°C"`, `"1"` for dimensionless. */
	symbol: string;
	/** Values are expressed in `symbol × 10^scale`. `-3` is milli, `-9` is nano. */
	scale: number;
};

/** The dimensionless unit, for counts, ratios and indices. */
export const DIMENSIONLESS: Unit = { symbol: "1", scale: 0 };

/** Seconds, for a duration reported at its base scale. */
export const SECOND: Unit = { symbol: "s", scale: 0 };

/** Milliseconds — seconds carried at milli scale, not a unit of their own. */
export const MILLISECOND: Unit = { symbol: "s", scale: -3 };

/** Microseconds. */
export const MICROSECOND: Unit = { symbol: "s", scale: -6 };

/** Nanoseconds. */
export const NANOSECOND: Unit = { symbol: "s", scale: -9 };

/** Bytes, for sizes and allocation counts. */
export const BYTE: Unit = { symbol: "B", scale: 0 };

/** Operations per second, for throughput. */
export const OPERATIONS_PER_SECOND: Unit = { symbol: "op/s", scale: 0 };

const SI_PREFIXES: Readonly<Record<number, string>> = {
	[-9]: "n",
	[-6]: "µ",
	[-3]: "m",
	[0]: "",
	[3]: "k",
	[6]: "M",
};

export function unitLabel(unit: Unit): string {
	return `${SI_PREFIXES[unit.scale] ?? `e${unit.scale}`}${unit.symbol}`;
}
