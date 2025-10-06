import { patternTrim } from "../../../ecma/regexp/pattern-trim.js";
import { patternInOutCapture } from "../../../ecma/regexp/pattern-util.js";

// https://httpwg.org/specs/rfc9110.html#rfc.section.2.1
const httpVcharPattern = "[\\x21-\\x7E]";

// https://httpwg.org/specs/rfc9110.html#rfc.section.5.5
const httpObsTextPattern = "[\\x80-\\xFF]";
//const httpFieldVcharPattern = `(?:${httpVcharPattern}|${httpObsTextPattern})`;
//const httpFieldContentPattern = `(?:${httpFieldVcharPattern}|(?:[ \\t]|${httpFieldVcharPattern})${httpFieldVcharPattern})`;
//const httpFieldValuePattern = `${httpFieldContentPattern}+`;

// https://httpwg.org/specs/rfc9110.html#rfc.section.5.6.2
//const httpTcharPattern = "[!#$%&'*+-.^_`|~0-9a-zA-Z]";
//const httpTokenPattern = `${httpTcharPattern}+`;
//const httpDelimitersPattern = '[(),/:;<=>?@[\\]{}\\\\"]';

// https://httpwg.org/specs/rfc9110.html#rfc.section.5.1
//const httpFieldNamePattern = httpTokenPattern;

// https://httpwg.org/specs/rfc9110.html#rfc.section.5.6.3
const httpOWsPattern = "[ \\t]*";
//const httpRWsPattern = "[ \\t]+";

// https://httpwg.org/specs/rfc9110.html#rfc.section.5.6.4
const httpQdtextPattern = `(?:[ \\t\\x21\\x23-\\x5B\\x5D-\\x7E]|${httpObsTextPattern})`;
function composeHttpQuotedPairPattern({
	outName,
	inName,
}: {
	outName?: string;
	inName?: string;
} = {}): string {
	const base = `(?:[ \\t]|${httpVcharPattern}|${httpObsTextPattern})`;

	return patternInOutCapture(base, {
		prePattern: "\\\\",
		inCaptureName: inName,
		outCaptureName: outName,
	});
}
function composeHttpQuotedStringPattern({
	outName,
	inName,
}: {
	outName?: string;
	inName?: string;
} = {}): string {
	const base = `(?:${httpQdtextPattern}|${composeHttpQuotedPairPattern()})*`;

	return patternInOutCapture(base, {
		prePattern: '"',
		postPattern: '"',
		inCaptureName: inName,
		outCaptureName: outName,
	});
}

// https://httpwg.org/specs/rfc9110.html#rfc.section.5.6.5
const httpCtextPattern = `(?:[ \\t\\x21-\\x27\\x2A-\\x5B\\x5D-\\x7E]|${httpObsTextPattern})`;

// https://httpwg.org/specs/rfc9110.html#rfc.section.5.6.7
const httpDayNamePattern = "(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)";
const httpDayPattern = "\\d{2}";
const httpMonthPattern = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)";
const httpYearPattern = "\\d{4}";
const httpDate1Pattern = `(?:${httpDayPattern} ${httpMonthPattern} ${httpYearPattern})`;
const httpTimeOfDayPattern = "(?:\\d{2}:\\d{2}:\\d{2})";
const httpImfFixdatePattern = `(?:${httpDayNamePattern}, ${httpDate1Pattern} ${httpTimeOfDayPattern} GMT)`;
const httpDate2Pattern = `(?:${httpDayPattern}-${httpMonthPattern}-\\d{2})`;
const httpDayNameLPattern =
	"(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)";
const httpRfc850DatePattern = `(?:${httpDayNameLPattern}, ${httpDate2Pattern} ${httpTimeOfDayPattern} GMT)`;
const httpDate3Pattern = `(?:${httpMonthPattern} (?:\\d{2}| \\d))`;
const httpAsctimeDatePattern = `(?:${httpDayNamePattern} ${httpDate3Pattern} ${httpTimeOfDayPattern} ${httpYearPattern})`;
const httpObsDatePattern = `(?:${httpRfc850DatePattern}|${httpAsctimeDatePattern})`;
const httpDatePattern = `(?:${httpImfFixdatePattern}|${httpObsDatePattern})`;

function composeHttpPossibleCommentPattern({
	outName,
	inName,
}: {
	outName?: string;
	inName?: string;
} = {}): string {
	const base = `(?:${httpCtextPattern}|${composeHttpQuotedPairPattern()}|\\(.*\\))*`;

	return patternInOutCapture(base, {
		prePattern: "\\(",
		postPattern: "\\)",
		inCaptureName: inName,
		outCaptureName: outName,
	});
}

function composeHttpCommentPattern({
	outName,
	inName,
	possibleSubCommentOutName,
}: {
	outName?: string;
	inName?: string;
	possibleSubCommentOutName?: string;
} = {}): string {
	const base = `(?:${httpCtextPattern}|${composeHttpQuotedPairPattern()}|${composeHttpPossibleCommentPattern({ outName: possibleSubCommentOutName })})*`;

	return patternInOutCapture(base, {
		prePattern: "\\(",
		postPattern: "\\)",
		inCaptureName: inName,
		outCaptureName: outName,
	});
}
/**
 * Split a HTTP field value by whitespace (OWS), as per RFC 9110.
 *
 * @param value The HTTP field value to split.
 * @returns An array of non-whitespace substrings.
 */
export function httpFieldSplitValueByWs(value: string): string[] {
	return value.split(new RegExp(httpOWsPattern)).filter(Boolean);
}

/**
 * Parse a comment from a HTTP field value.
 *
 * @see https://httpwg.org/specs/rfc9110.html#comments
 * @param value The HTTP field value containing the comment.
 * @returns The parsed comment, or null if not found.
 */
export function httpFieldParseHttpComment(value: string): string | null {
	const pattern = composeHttpCommentPattern({
		inName: "comment",
	});
	const match = new RegExp(pattern).exec(value);
	return match?.groups?.comment ?? null;
}

/**
 * Parse a quoted string from a HTTP field value.
 *
 * @see https://httpwg.org/specs/rfc9110.html#rfc.section.5.6.4
 * @param value The HTTP field value containing the quoted string.
 * @returns The parsed quoted string, or null if not found.
 */
export function httpFieldParseQuotedString(value: string): string | null {
	const pattern = composeHttpQuotedStringPattern({ inName: "quotedString" });
	const match = new RegExp(pattern).exec(value);
	return match?.groups?.quotedString ?? null;
}

/**
 * Unfold a HTTP field value into its list elements, handling quoted strings,
 * comments, and date formats as per RFC 9110.
 *
 * @see https://httpwg.org/specs/rfc9110.html#rfc.section.5.6.1
 * @param value The HTTP field value to unfold.
 * @returns An array of unfolded field values.
 */
export function httpFieldUnfoldValues(value?: string): string[] {
	if (!value) return [];
	const pattern = `(?:(?:${httpDatePattern}${httpOWsPattern})|(?:${composeHttpQuotedStringPattern()}${httpOWsPattern})|(?:${composeHttpCommentPattern()}${httpOWsPattern}))+.*?(?:,|$)|,`;
	const regex = new RegExp(pattern, "g");
	const separators = Array.from(value.matchAll(regex));
	const values: string[] = [];
	let lastEnd = 0;
	for (let index = 0; index < separators.length; index++) {
		// biome-ignore lint/style/noNonNullAssertion: indexed loop
		const separator = separators[index]!;
		const end = separator.index + separator[0].length;
		values.push(
			value.substring(lastEnd, separator[0].endsWith(",") ? end - 1 : end),
		);
		lastEnd = end;
	}
	values.push(value.substring(lastEnd));

	return values
		.map((e) => patternTrim(e, httpOWsPattern))
		.filter((e) => e.length > 0);
}

/**
 * Fold a list of HTTP field values into a single string, separated by commas
 * and optional whitespace, as per RFC 9110.
 *
 * @see https://httpwg.org/specs/rfc9110.html#rfc.section.5.3
 * @param values The list of HTTP field values to fold.
 * @param spacing Optional whitespace to insert after each comma (default is a single space).
 * @returns The folded HTTP field value string.
 */
export function httpFieldFoldValues(values: string[], spacing = " "): string {
	if (!new RegExp(`^${httpOWsPattern}$`).test(spacing)) {
		throw new Error("Invalid spacing");
	}
	return values.join(`,${spacing}`);
}
