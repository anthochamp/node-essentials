import type { CronField, CronFieldItem, CronSchedule } from "./ast.js";

function printItem(item: CronFieldItem): string {
	switch (item.kind) {
		case "wildcard":
			return item.step === undefined ? "*" : `*/${item.step}`;
		case "value":
			return String(item.value);
		case "range":
			return item.step === undefined
				? `${item.from}-${item.to}`
				: `${item.from}-${item.to}/${item.step}`;
	}
}

/** Prints one cron field in canonical (numeric, as-parsed order) form. */
export function printCronField(field: CronField): string {
	return field.map(printItem).join(",");
}

/** Prints a full cron expression in canonical form. */
export function printCron(schedule: CronSchedule): string {
	return [
		schedule.minute,
		schedule.hour,
		schedule.dayOfMonth,
		schedule.month,
		schedule.dayOfWeek,
	]
		.map(printCronField)
		.join(" ");
}
