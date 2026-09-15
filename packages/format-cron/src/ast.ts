/** Which of the five standard cron fields a node belongs to. */
export type CronFieldKind =
	| "minute"
	| "hour"
	| "dayOfMonth"
	| "month"
	| "dayOfWeek";

/** A single explicit value, e.g. `5`. */
export interface CronValue {
	readonly kind: "value";
	readonly value: number;
}

/** An inclusive range, optionally stepped, e.g. `1-5` or `1-10/2`. */
export interface CronRange {
	readonly kind: "range";
	readonly from: number;
	readonly to: number;
	readonly step?: number;
}

/** The full field range (`*`), optionally stepped, e.g. `*` or `*\/3`. */
export interface CronWildcard {
	readonly kind: "wildcard";
	readonly step?: number;
}

export type CronFieldItem = CronValue | CronRange | CronWildcard;

/** A comma-separated list of items — the AST for one cron field. */
export type CronField = readonly CronFieldItem[];

/** The AST for a full 5-field cron expression. */
export interface CronSchedule {
	readonly minute: CronField;
	readonly hour: CronField;
	readonly dayOfMonth: CronField;
	readonly month: CronField;
	readonly dayOfWeek: CronField;
}
