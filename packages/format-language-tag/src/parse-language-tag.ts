import {
	isAsciiAlpha,
	isAsciiAlphaNumeric,
	isAsciiDigit,
	LOWERCASE_X,
	upperFirst,
} from "@ac-kit/core";

import { LanguageTagSyntaxError } from "./errors.js";
import {
	IRREGULAR_LANGUAGE_TAGS,
	type LanguageTag,
	type LanguageTagExtension,
} from "./language-tag.js";

const MAX_EXTLANGS_ = 3;
const PRIVATE_USE_ = "x";

// The productions of RFC 5646 §2.1, over already-lowercased subtags. Each is a
// character class plus a length range, which is why one helper covers them all.
const isLanguage_ = (subtag: string) => isSubtag_(subtag, 2, 8, isAsciiAlpha);
const isExtlang_ = (subtag: string) => isSubtag_(subtag, 3, 3, isAsciiAlpha);
const isScript_ = (subtag: string) => isSubtag_(subtag, 4, 4, isAsciiAlpha);
const isExtensionSubtag_ = (subtag: string) =>
	isSubtag_(subtag, 2, 8, isAsciiAlphaNumeric);
const isPrivateUseSubtag_ = (subtag: string) =>
	isSubtag_(subtag, 1, 8, isAsciiAlphaNumeric);

function isRegion_(subtag: string): boolean {
	return (
		isSubtag_(subtag, 2, 2, isAsciiAlpha) ||
		isSubtag_(subtag, 3, 3, isAsciiDigit)
	);
}

function isVariant_(subtag: string): boolean {
	if (isSubtag_(subtag, 5, 8, isAsciiAlphaNumeric)) {
		return true;
	}
	return (
		isAsciiDigit(subtag.charCodeAt(0)) &&
		isSubtag_(subtag, 4, 4, isAsciiAlphaNumeric)
	);
}

/** A singleton opens an extension; `x` opens private use and is excluded. */
function isSingleton_(subtag: string): boolean {
	return (
		isSubtag_(subtag, 1, 1, isAsciiAlphaNumeric) &&
		subtag.charCodeAt(0) !== LOWERCASE_X
	);
}

function isSubtag_(
	subtag: string,
	minLength: number,
	maxLength: number,
	isMember: (code: number) => boolean,
): boolean {
	if (subtag.length < minLength || subtag.length > maxLength) {
		return false;
	}
	for (let at = 0; at < subtag.length; at++) {
		if (!isMember(subtag.charCodeAt(at))) {
			return false;
		}
	}
	return true;
}

/**
 * Parses a BCP 47 language tag.
 *
 * Recognises the whole `Language-Tag` production: `langtag`, a private-use-only
 * tag, and the seventeen irregular grandfathered tags. The regular
 * grandfathered tags parse as ordinary `langtag`s, which is what they are.
 *
 * Only well-formedness is checked. A tag whose subtags are absent from the IANA
 * registry — `qq-Zxxx-QQ` — is well-formed and parses without complaint.
 *
 * @throws {LanguageTagSyntaxError} When `text` does not match the grammar.
 */
export function parseLanguageTag(text: string): LanguageTag {
	const registered = IRREGULAR_LANGUAGE_TAGS.get(text.toLowerCase());
	if (registered !== undefined) {
		return { kind: "irregular", text: registered };
	}

	const subtags = text.toLowerCase().split("-");
	if (subtags[0] === PRIVATE_USE_) {
		return {
			kind: "privateUse",
			subtags: readPrivateUse_(text, subtags, 1),
		};
	}

	return readLangtag_(text, subtags);
}

/**
 * Parses a BCP 47 language tag, or answers `null` where the grammar is not met.
 *
 * For callers that treat unparseable input as a normal outcome — validating a
 * user-supplied locale, sniffing a filename — rather than as a fault.
 */
export function tryParseLanguageTag(text: string): LanguageTag | null {
	try {
		return parseLanguageTag(text);
	} catch (error) {
		if (error instanceof LanguageTagSyntaxError) {
			return null;
		}
		throw error;
	}
}

/** Whether `text` matches the `Language-Tag` grammar of RFC 5646 §2.1. */
export function isWellFormedLanguageTag(text: string): boolean {
	return tryParseLanguageTag(text) !== null;
}

function readLangtag_(source: string, subtags: readonly string[]): LanguageTag {
	const language = subtags[0] ?? "";
	if (!isLanguage_(language)) {
		throw new LanguageTagSyntaxError(source, 0, "expected a language subtag");
	}

	let at = 1;

	// A three-letter subtag here can only be an extlang: a region is two letters
	// or three digits, and a variant needs five characters or a leading digit.
	const extlangs: string[] = [];
	if (language.length <= 3) {
		while (extlangs.length < MAX_EXTLANGS_ && isExtlang_(subtags[at] ?? "")) {
			extlangs.push(subtags[at]!);
			at++;
		}
	}

	let script: string | null = null;
	if (isScript_(subtags[at] ?? "")) {
		script = upperFirst(subtags[at]!);
		at++;
	}

	let region: string | null = null;
	if (isRegion_(subtags[at] ?? "")) {
		region = subtags[at]!.toUpperCase();
		at++;
	}

	const variants: string[] = [];
	while (isVariant_(subtags[at] ?? "")) {
		const variant = subtags[at]!;
		if (variants.includes(variant)) {
			throw new LanguageTagSyntaxError(source, at, "duplicate variant subtag");
		}
		variants.push(variant);
		at++;
	}

	const extensions: LanguageTagExtension[] = [];
	const singletons = new Set<string>();
	while (isSingleton_(subtags[at] ?? "")) {
		const singleton = subtags[at]!;
		if (singletons.has(singleton)) {
			throw new LanguageTagSyntaxError(source, at, "duplicate extension");
		}
		singletons.add(singleton);
		at++;

		const extensionSubtags: string[] = [];
		while (isExtensionSubtag_(subtags[at] ?? "")) {
			extensionSubtags.push(subtags[at]!);
			at++;
		}
		if (extensionSubtags.length === 0) {
			throw new LanguageTagSyntaxError(
				source,
				at,
				`extension ${singleton} has no subtags`,
			);
		}
		extensions.push({ singleton, subtags: extensionSubtags });
	}

	let privateUse: readonly string[] = [];
	if (subtags[at] === PRIVATE_USE_) {
		privateUse = readPrivateUse_(source, subtags, at + 1);
		at = subtags.length;
	}

	if (at < subtags.length) {
		throw new LanguageTagSyntaxError(source, at, "unexpected subtag");
	}

	return {
		kind: "langtag",
		language,
		extlangs,
		script,
		region,
		variants,
		extensions,
		privateUse,
	};
}

function readPrivateUse_(
	source: string,
	subtags: readonly string[],
	from: number,
): string[] {
	const collected: string[] = [];
	for (let at = from; at < subtags.length; at++) {
		const subtag = subtags[at] as string;
		if (!isPrivateUseSubtag_(subtag)) {
			throw new LanguageTagSyntaxError(
				source,
				at,
				"expected a private-use subtag",
			);
		}
		collected.push(subtag);
	}

	if (collected.length === 0) {
		throw new LanguageTagSyntaxError(
			source,
			from,
			"private use has no subtags",
		);
	}
	return collected;
}
