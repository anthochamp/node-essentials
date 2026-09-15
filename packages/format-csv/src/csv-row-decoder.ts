import type { DecodeContext, Decoder, DecodeResult } from "@ac-kit/format-core";

import type { CsvOptions } from "./types.js";

/** Splits one already-delimited record into its raw fields. */
function splitRow(record: string, delimiter: string): string[] {
	const fields: string[] = [];
	let field = "";
	let inQuotes = false;
	let index = 0;

	while (index < record.length) {
		const char = record[index]!;

		if (inQuotes) {
			if (char === '"') {
				if (record[index + 1] === '"') {
					field += '"';
					index += 2;
					continue;
				}
				inQuotes = false;
				index += 1;
				continue;
			}
			field += char;
			index += 1;
			continue;
		}

		if (char === '"') {
			inQuotes = true;
			index += 1;
			continue;
		}

		if (char === delimiter) {
			fields.push(field);
			field = "";
			index += 1;
			continue;
		}

		field += char;
		index += 1;
	}

	fields.push(field);
	return fields;
}

/**
 * Decodes one RFC 4180 record per unquoted line terminator.
 *
 * The single implementation of the CSV read grammar: `parseCsv` and
 * `CsvParseStream` are both driven by this rather than repeating it.
 *
 * A record is self-delimiting, but only once quote state is tracked — a line
 * terminator inside a quoted field does not end the record, which is why this
 * cannot be a line decoder with a split applied afterwards.
 *
 * Lenient on line endings: `\r\n` and bare `\n` both terminate a record,
 * whatever `CsvOptions.newline` says, since that option only controls output.
 *
 * Stateful across partial records, so an instance must back exactly one driver.
 */
export class CsvRowDecoder implements Decoder<string[], string> {
	private readonly delimiter: string;

	/** Characters already searched for a terminator. */
	private scanned = 0;

	/** Quote state at {@link scanned}, so the scan resumes instead of restarting. */
	private inQuotes = false;

	constructor(options?: CsvOptions) {
		this.delimiter = options?.delimiter ?? ",";
	}

	decode(view: string, context: DecodeContext): DecodeResult<string[]> {
		let index = this.scanned <= view.length ? this.scanned : 0;
		let inQuotes = index === this.scanned ? this.inQuotes : false;

		while (index < view.length) {
			const char = view[index]!;

			if (char === '"') {
				// An escaped quote inside a quoted field is two quotes; skipping both
				// keeps the state machine in the same place it started.
				if (inQuotes && view[index + 1] === '"') {
					index += 2;
					continue;
				}
				inQuotes = !inQuotes;
				index += 1;
				continue;
			}

			if (!inQuotes && (char === "\n" || char === "\r")) {
				const terminator = char === "\r" && view[index + 1] === "\n" ? 2 : 1;
				this.reset();
				return {
					status: "decoded",
					value: splitRow(view.slice(0, index), this.delimiter),
					consumed: index + terminator,
				};
			}

			index += 1;
		}

		if (context.atEof && view.length > 0) {
			this.reset();
			return {
				status: "decoded",
				value: splitRow(view, this.delimiter),
				consumed: view.length,
			};
		}

		this.scanned = index;
		this.inQuotes = inQuotes;
		return { status: "incomplete" };
	}

	reset(): void {
		this.scanned = 0;
		this.inQuotes = false;
	}
}
