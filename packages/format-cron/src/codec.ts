import type { CronField, CronSchedule } from "./ast.js";
import { CRON_FIELD_SPECS, type CronFieldSpec } from "./field-spec.js";

function isWildcardOnly(field: CronField): boolean {
	return (
		field.length === 1 &&
		field[0]!.kind === "wildcard" &&
		field[0]!.step === undefined
	);
}

function expandField(
	field: CronField,
	spec: CronFieldSpec,
): ReadonlySet<number> {
	const values = new Set<number>();
	for (const item of field) {
		switch (item.kind) {
			case "wildcard": {
				const step = item.step ?? 1;
				for (let value = spec.min; value <= spec.max; value += step) {
					values.add(value);
				}
				break;
			}
			case "value":
				values.add(item.value);
				break;
			case "range": {
				const step = item.step ?? 1;
				for (let value = item.from; value <= item.to; value += step) {
					values.add(value);
				}
				break;
			}
		}
	}
	return values;
}

/**
 * A {@link CronSchedule}, pre-expanded into per-field membership sets.
 *
 * Expanding is O(field range); building it once and reusing it is what keeps
 * {@link nextRun}'s per-minute search O(1) per candidate instead of re-expanding
 * all five fields on every minute it tries.
 */
export interface ExpandedCronSchedule {
	readonly minuteSet: ReadonlySet<number>;
	readonly hourSet: ReadonlySet<number>;
	readonly dayOfMonthSet: ReadonlySet<number>;
	readonly monthSet: ReadonlySet<number>;
	readonly dayOfWeekSet: ReadonlySet<number>;
	readonly dayOfMonthRestricted: boolean;
	readonly dayOfWeekRestricted: boolean;
}

/**
 * Pre-expands `schedule` for repeated matching — see
 * {@link ExpandedCronSchedule}.
 */
export function expandSchedule(schedule: CronSchedule): ExpandedCronSchedule {
	return {
		minuteSet: expandField(schedule.minute, CRON_FIELD_SPECS.minute),
		hourSet: expandField(schedule.hour, CRON_FIELD_SPECS.hour),
		dayOfMonthSet: expandField(
			schedule.dayOfMonth,
			CRON_FIELD_SPECS.dayOfMonth,
		),
		monthSet: expandField(schedule.month, CRON_FIELD_SPECS.month),
		dayOfWeekSet: expandField(schedule.dayOfWeek, CRON_FIELD_SPECS.dayOfWeek),
		dayOfMonthRestricted: !isWildcardOnly(schedule.dayOfMonth),
		dayOfWeekRestricted: !isWildcardOnly(schedule.dayOfWeek),
	};
}

/**
 * Whether `date` (read in local time) matches an
 * already-{@link expandSchedule}d schedule.
 *
 * When both day-of-month and day-of-week are restricted (not `*`), a date
 * matches if it satisfies _either_ field — standard Vixie-cron semantics, not a
 * plain AND of all five fields.
 */
export function matchesExpanded(
	expanded: ExpandedCronSchedule,
	date: Date,
): boolean {
	if (
		!expanded.minuteSet.has(date.getMinutes()) ||
		!expanded.hourSet.has(date.getHours()) ||
		!expanded.monthSet.has(date.getMonth() + 1)
	) {
		return false;
	}

	const { dayOfMonthRestricted, dayOfWeekRestricted } = expanded;
	if (!dayOfMonthRestricted && !dayOfWeekRestricted) return true;
	if (dayOfMonthRestricted && dayOfWeekRestricted) {
		return (
			expanded.dayOfMonthSet.has(date.getDate()) ||
			expanded.dayOfWeekSet.has(date.getDay())
		);
	}
	return dayOfMonthRestricted
		? expanded.dayOfMonthSet.has(date.getDate())
		: expanded.dayOfWeekSet.has(date.getDay());
}

/**
 * Whether `date` (read in local time) matches `schedule`. See
 * {@link matchesExpanded}.
 */
export function cronMatches(schedule: CronSchedule, date: Date): boolean {
	return matchesExpanded(expandSchedule(schedule), date);
}

/**
 * Upper bound on how far `nextRun` searches before giving up (~4 years of
 * minutes).
 */
export const MAX_NEXT_RUN_SEARCH_MINUTES = 4 * 365 * 24 * 60;

/**
 * Finds the next minute (strictly after `from`, read/returned in local time)
 * that matches `schedule`.
 *
 * @throws {Error} If no match is found within
 *   {@link MAX_NEXT_RUN_SEARCH_MINUTES} (e.g. `31` for a dayOfMonth in February
 *   only).
 */
export function nextRun(schedule: CronSchedule, from: Date): Date {
	const expanded = expandSchedule(schedule);
	const candidate = new Date(from.getTime());
	candidate.setSeconds(0, 0);
	candidate.setMinutes(candidate.getMinutes() + 1);

	for (let minute = 0; minute < MAX_NEXT_RUN_SEARCH_MINUTES; minute++) {
		if (matchesExpanded(expanded, candidate)) return candidate;
		candidate.setMinutes(candidate.getMinutes() + 1);
	}
	throw new Error(
		`nextRun: no matching run found within ${MAX_NEXT_RUN_SEARCH_MINUTES} minutes`,
	);
}
