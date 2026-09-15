/** Options for {@link printIni}. */
export type IniPrintOptions = {
	/** Line terminator. Defaults to `"\n"`. */
	readonly newline?: string;

	/** Whitespace around `=`. Defaults to `" "` on both sides. */
	readonly spaceAroundEquals?: boolean;

	/** Whether a dotted path nests into sections. Defaults to `false`. */
	readonly dottedKeys?: boolean;
};

function isSection(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		!(value instanceof Date)
	);
}

function formatValue(value: unknown): string {
	// oxlint-disable-next-line typescript/no-base-to-string
	const text = value === null || value === undefined ? "" : value.toString();
	// Leading or trailing space, or an embedded comment marker, would not survive
	// a round trip unquoted.
	return /^\s|\s$|[;#"']/.test(text)
		? `"${text.replace(/(["\\])/g, "\\$1")}"`
		: text;
}

function printEntries(
	target: string[],
	record: Record<string, unknown>,
	separator: string,
): void {
	for (const [key, value] of Object.entries(record)) {
		if (isSection(value)) {
			continue;
		}
		if (Array.isArray(value)) {
			for (const item of value) {
				target.push(`${key}${separator}${formatValue(item)}`);
			}
			continue;
		}
		if (value === true) {
			target.push(key);
			continue;
		}
		target.push(`${key}${separator}${formatValue(value)}`);
	}
}

function printSections(
	target: string[],
	record: Record<string, unknown>,
	separator: string,
	prefix: readonly string[],
	dottedKeys: boolean,
): void {
	for (const [key, value] of Object.entries(record)) {
		if (!isSection(value)) {
			continue;
		}
		const path = [...prefix, key];
		target.push(`[${path.join(".")}]`);
		printEntries(target, value, separator);
		printSections(target, value, separator, dottedKeys ? path : [], dottedKeys);
	}
}

/**
 * Serializes a plain object as INI text.
 *
 * Top-level scalars come first, then one section per nested object. A value
 * needing quotes to survive a round trip gets them; the rest are written bare.
 */
export function printIni(
	value: Record<string, unknown>,
	options?: IniPrintOptions,
): string {
	const newline = options?.newline ?? "\n";
	const separator = (options?.spaceAroundEquals ?? true) ? " = " : "=";
	const dottedKeys = options?.dottedKeys ?? false;

	const lines: string[] = [];
	printEntries(lines, value, separator);
	printSections(lines, value, separator, [], dottedKeys);

	return lines.length === 0 ? "" : `${lines.join(newline)}${newline}`;
}
