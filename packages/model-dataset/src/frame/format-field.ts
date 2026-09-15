import type { Value } from "./column.js";
import type { FieldDescriptor } from "./field.js";

export type FormatFieldOptions = {
	/** Passed to `Intl`. Absent uses the runtime default. */
	locale?: string | string[];
	/** Text for a `null` cell. Default `""`. */
	nullText?: string;
};

/** A field's human label, falling back to its machine name. */
export function fieldTitle(field: FieldDescriptor): string {
	return field.title ?? field.name;
}

/** A geometry has no meaningful `toString`, so it reports its shape kind. */
function plainText_(value: Exclude<Value, null>): string {
	return typeof value === "object" ? value.type : String(value);
}

/**
 * A reusable formatter for one field's cells.
 *
 * Built once per column, never per cell: constructing an `Intl.NumberFormat`
 * costs far more than using one, and a table renderer calls this per row.
 *
 * @returns A function mapping any cell of that field to display text.
 */
export function createFieldFormatter(
	field: FieldDescriptor,
	options?: FormatFieldOptions,
): (value: Value) => string {
	const nullText = options?.nullText ?? "";
	const format = createUnaffixedFormatter_(field, nullText, options?.locale);

	const prefix = field.prefix ?? "";
	const suffix = field.suffix ?? "";
	if (prefix === "" && suffix === "") {
		return format;
	}
	return (value) =>
		value === null ? nullText : `${prefix}${format(value)}${suffix}`;
}

function createUnaffixedFormatter_(
	field: FieldDescriptor,
	nullText: string,
	locale: string | string[] | undefined,
): (value: Value) => string {
	if (field.kind === "temporal") {
		const dateFormat = new Intl.DateTimeFormat(locale, field.dateFormat);
		return (value) => {
			if (value === null) {
				return nullText;
			}
			if (typeof value === "number" || typeof value === "bigint") {
				return dateFormat.format(Number(value));
			}
			return plainText_(value);
		};
	}

	if (field.kind === "quantitative" || field.kind === "cyclic") {
		const numberFormat = new Intl.NumberFormat(locale, field.format);
		return (value) => {
			if (value === null) {
				return nullText;
			}
			if (typeof value === "number" || typeof value === "bigint") {
				return numberFormat.format(value);
			}
			return plainText_(value);
		};
	}

	return (value) => (value === null ? nullText : plainText_(value));
}

/**
 * One cell as display text.
 *
 * Convenient for a one-off; use {@link createFieldFormatter} whenever a whole
 * column is being rendered.
 */
export function formatFieldValue(
	value: Value,
	field: FieldDescriptor,
	options?: FormatFieldOptions,
): string {
	return createFieldFormatter(field, options)(value);
}
