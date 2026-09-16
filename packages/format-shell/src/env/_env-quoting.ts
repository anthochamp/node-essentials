import { UnsupportedError } from "@ac-kit/core";

/**
 * A `.env` value made only of these characters needs no quotes: none of them
 * can start a comment, end the value early, or be eaten by the leading and
 * trailing whitespace a reader strips.
 */
const DOTENV_BARE_VALUE_RE_ = /^[A-Za-z0-9_@%+=:,./-]*$/;

/** The escapes a double-quoted `.env` value recognises, keyed by their letter. */
const DOTENV_UNESCAPES_ = new Map<string, string>([
	["n", "\n"],
	["r", "\r"],
	["t", "\t"],
	["f", "\f"],
	["b", "\b"],
	["v", "\v"],
]);

export function quoteDotenvValue(value: string): string {
	if (DOTENV_BARE_VALUE_RE_.test(value)) {
		return value;
	}

	const escaped = value
		.replace(/[\\"$`]/g, "\\$&")
		.replace(/\n/g, "\\n")
		.replace(/\r/g, "\\r")
		.replace(/\t/g, "\\t");

	return `"${escaped}"`;
}

/**
 * Reports the quote a `.env` value opens and never closes, so a reader can keep
 * appending lines to it. A value spanning lines is how a PEM key or a JSON blob
 * reaches a `.env` file.
 */
export function unterminatedDotenvQuote(rawValue: string): string | null {
	const trimmed = rawValue.trimStart();
	const quote = trimmed[0];
	if (quote !== '"' && quote !== "'") {
		return null;
	}

	return isDotenvQuoteClosed_(trimmed, quote) ? null : quote;
}

function isDotenvQuoteClosed_(trimmed: string, quote: string): boolean {
	for (let i = 1; i < trimmed.length; i++) {
		if (quote === '"' && trimmed[i] === "\\") {
			i++;
			continue;
		}
		if (trimmed[i] === quote) {
			return true;
		}
	}

	return false;
}

export function unquoteDotenvValue(rawValue: string): string {
	const trimmed = rawValue.trim();

	if (trimmed.length >= 2) {
		// Single quotes are literal in POSIX and in every `.env` reader built on
		// it: there is nothing to unescape inside them.
		if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
			return trimmed.slice(1, -1);
		}
		if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
			return unescapeDotenvValue_(trimmed.slice(1, -1));
		}
	}

	return stripDotenvComment_(trimmed);
}

function unescapeDotenvValue_(quoted: string): string {
	let result = "";

	for (let i = 0; i < quoted.length; i++) {
		const char = quoted[i];
		if (char !== "\\" || i === quoted.length - 1) {
			result += char;
			continue;
		}

		i++;
		const escaped = quoted[i] as string;
		result += DOTENV_UNESCAPES_.get(escaped) ?? escaped;
	}

	return result;
}

/**
 * A `#` only starts a comment when whitespace precedes it: an unquoted value is
 * allowed to contain one, which is how a URL fragment or a colour survives.
 */
function stripDotenvComment_(trimmed: string): string {
	return trimmed.replace(/\s+#.*$/s, "").trimEnd();
}

export function quoteWin32SetValue(value: string): string {
	if (/["\r\n]/.test(value)) {
		// `set "NAME=value"` ends at the first quote and cmd.exe offers no escape
		// for one inside the assignment, so there is no spelling to fall back on.
		throw new UnsupportedError(
			'cmd.exe "set" value containing a quote or a newline',
		);
	}

	return value.replace(/%/g, "%%");
}

export function unquoteWin32SetValue(rawValue: string): string {
	return rawValue.replace(/%%/g, "%");
}
