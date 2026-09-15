export type DurationUnit =
	| "nanosecond"
	| "microsecond"
	| "millisecond"
	| "second"
	| "minute"
	| "hour"
	| "day";

export type FormatDurationOptions = {
	/** Forwarded to `Intl.DurationFormat`. Default `"narrow"`. */
	readonly style?: "long" | "short" | "narrow" | "digital";
	/** Significant digits on the selected unit. Default 3. */
	readonly precision?: number;
	/** Never select a unit smaller than this. */
	readonly minUnit?: DurationUnit;
	readonly locale?: string;
};

/** Largest to smallest. Index doubles as this module's canonical ordering. */
const UNIT_ORDER = [
	"day",
	"hour",
	"minute",
	"second",
	"millisecond",
	"microsecond",
	"nanosecond",
] as const satisfies readonly DurationUnit[];

const NANOSECONDS_PER_UNIT: Readonly<Record<DurationUnit, number>> = {
	day: 86_400_000_000_000,
	hour: 3_600_000_000_000,
	minute: 60_000_000_000,
	second: 1_000_000_000,
	millisecond: 1_000_000,
	microsecond: 1_000,
	nanosecond: 1,
};

const DURATION_FIELD_NAME: Readonly<Record<DurationUnit, string>> = {
	day: "days",
	hour: "hours",
	minute: "minutes",
	second: "seconds",
	millisecond: "milliseconds",
	microsecond: "microseconds",
	nanosecond: "nanoseconds",
};

/**
 * How many `UNIT_ORDER[index]` make one `UNIT_ORDER[index - 1]`. `index` must
 * be > 0.
 */
function stepAboveIndex(index: number): number {
	return (
		NANOSECONDS_PER_UNIT[UNIT_ORDER[index - 1]!] /
		NANOSECONDS_PER_UNIT[UNIT_ORDER[index]!]
	);
}

function digitCount_(value: number): number {
	return value === 0 ? 1 : Math.floor(Math.log10(value)) + 1;
}

/**
 * Formats `value`, expressed in `unit`, by selecting the largest unit whose
 * magnitude is at least 1 and delegating to `Intl.DurationFormat`.
 *
 * `precision` controls how many smaller units are shown alongside the selected
 * one (e.g. `"1s 234ms"` for a duration of 1.234 seconds at the default
 * precision of 3), rounding — with carry — the last one shown.
 */
export function formatDuration(
	value: number,
	unit: DurationUnit,
	options?: FormatDurationOptions,
): string {
	if (!Number.isFinite(value) || value < 0) {
		throw new RangeError(
			`formatDuration: value must be a non-negative finite number, got ${value}`,
		);
	}

	const precision = options?.precision ?? 3;
	const minUnitIndex =
		options?.minUnit === undefined
			? UNIT_ORDER.length - 1
			: UNIT_ORDER.indexOf(options.minUnit);

	const totalNs = value * NANOSECONDS_PER_UNIT[unit];

	let selectedIndex = UNIT_ORDER.indexOf(unit);
	for (const [index, candidate] of UNIT_ORDER.entries()) {
		if (totalNs / NANOSECONDS_PER_UNIT[candidate] >= 1) {
			selectedIndex = index;
			break;
		}
	}
	selectedIndex = Math.min(selectedIndex, minUnitIndex);

	// Exact mixed-radix breakdown, selected unit down to `minUnit` (nanosecond
	// by default). `remainingNs` after the loop is whatever falls below the
	// finest unit shown — always folded into that unit's rounding below.
	const values: number[] = [];
	let remainingNs = totalNs;
	for (let index = selectedIndex; index <= minUnitIndex; index += 1) {
		const factor = NANOSECONDS_PER_UNIT[UNIT_ORDER[index]!];
		const fieldValue = Math.floor(remainingNs / factor);
		values.push(fieldValue);
		remainingNs -= fieldValue * factor;
	}

	// Keep only as many fields as needed for `precision` significant digits.
	let digitsSoFar = 0;
	let cutoff = 0;
	for (let index = 0; index < values.length; index += 1) {
		digitsSoFar +=
			index === 0
				? digitCount_(values[0]!)
				: Math.ceil(Math.log10(stepAboveIndex(selectedIndex + index)));
		cutoff = index;
		if (digitsSoFar >= precision) {
			break;
		}
	}

	// Round the last kept field using everything below it (dropped fields plus
	// the sub-`minUnit` remainder), carrying into coarser fields as needed.
	let leftoverNs = remainingNs;
	for (let index = values.length - 1; index > cutoff; index -= 1) {
		leftoverNs +=
			values[index]! * NANOSECONDS_PER_UNIT[UNIT_ORDER[selectedIndex + index]!];
	}
	const cutoffFactor =
		NANOSECONDS_PER_UNIT[UNIT_ORDER[selectedIndex + cutoff]!];
	if (leftoverNs * 2 >= cutoffFactor) {
		let index = cutoff;
		values[index] = values[index]! + 1;
		while (
			index > 0 &&
			values[index]! >= stepAboveIndex(selectedIndex + index)
		) {
			values[index] = values[index]! - stepAboveIndex(selectedIndex + index);
			values[index - 1] = values[index - 1]! + 1;
			index -= 1;
		}
	}
	values.length = cutoff + 1;

	// A rounded-up first field can overflow into a coarser unit that was never
	// selected (e.g. 23.9999h rounding up to a full day).
	if (selectedIndex > 0 && values[0]! >= stepAboveIndex(selectedIndex)) {
		values[0] = values[0]! - stepAboveIndex(selectedIndex);
		values.unshift(1);
		selectedIndex -= 1;
	}

	const duration: Record<string, number> = {};
	for (const [index, fieldValue] of values.entries()) {
		duration[DURATION_FIELD_NAME[UNIT_ORDER[selectedIndex + index]!]!] =
			fieldValue;
	}

	const style = options?.style ?? "narrow";
	const formatted = new Intl.DurationFormat(options?.locale, { style }).format(
		duration,
	);

	// `Intl.DurationFormat` renders an all-zero duration as "" for every style
	// but "digital" (verified empirically, not documented) — fall back to
	// `Intl.NumberFormat`'s unit style, which pluralizes zero correctly.
	if (formatted !== "" || style === "digital") {
		return formatted;
	}

	return new Intl.NumberFormat(options?.locale, {
		style: "unit",
		unit: UNIT_ORDER[selectedIndex]!,
		unitDisplay: style,
	}).format(0);
}
