import type { CronFieldKind } from "./ast.js";

/** Bounds and optional name table for one cron field. */
export interface CronFieldSpec {
	readonly min: number;
	readonly max: number;
	readonly names?: ReadonlyMap<string, number>;
	/** Whether `max + 1` (e.g. day-of-week `7`) is accepted as an alias for `min`. */
	readonly wrapMaxPlusOneToMin?: boolean;
}

const MONTH_NAMES: ReadonlyMap<string, number> = new Map([
	["JAN", 1],
	["FEB", 2],
	["MAR", 3],
	["APR", 4],
	["MAY", 5],
	["JUN", 6],
	["JUL", 7],
	["AUG", 8],
	["SEP", 9],
	["OCT", 10],
	["NOV", 11],
	["DEC", 12],
]);

const DAY_OF_WEEK_NAMES: ReadonlyMap<string, number> = new Map([
	["SUN", 0],
	["MON", 1],
	["TUE", 2],
	["WED", 3],
	["THU", 4],
	["FRI", 5],
	["SAT", 6],
]);

export const CRON_FIELD_SPECS: Readonly<Record<CronFieldKind, CronFieldSpec>> =
	{
		minute: { min: 0, max: 59 },
		hour: { min: 0, max: 23 },
		dayOfMonth: { min: 1, max: 31 },
		month: { min: 1, max: 12, names: MONTH_NAMES },
		dayOfWeek: {
			min: 0,
			max: 6,
			names: DAY_OF_WEEK_NAMES,
			wrapMaxPlusOneToMin: true,
		},
	};

/** Order the five fields appear in a cron expression. */
export const CRON_FIELD_ORDER: readonly CronFieldKind[] = [
	"minute",
	"hour",
	"dayOfMonth",
	"month",
	"dayOfWeek",
];
