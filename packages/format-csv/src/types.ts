/** A cell `stringifyCsv` can serialize. Anything richer is formatted first. */
export type CsvCell = string | number | bigint | boolean | null;

export type CsvOptions = {
	/** Default `","`. */
	readonly delimiter?: string;
	/** Default `"\r\n"`, per RFC 4180. */
	readonly newline?: string;
	/** Whether `renderFrameAsCsv` emits a header row. Default `true`. */
	readonly header?: boolean;
	/** Locale for `renderFrameAsCsv`'s number and date formatting. */
	readonly locale?: string | string[];
};
