import {
	isAsciiAlpha,
	isAsciiAlphaNumeric,
	isAsciiBlank,
	isAsciiControl,
	isAsciiDigit,
	isAsciiGraphic,
	isAsciiHexDigit,
	isAsciiLowerAlpha,
	isAsciiPrintable,
	isAsciiPunctuation,
	isAsciiUpperAlpha,
	isAsciiWhitespace,
} from "@ac-kit/core";

import { type CharSet, normalizeCharSet } from "./_char-set.js";
import type { GlobPosixClassName } from "./ast.js";

/**
 * The POSIX classes in the C locale, as glob(7) and fnmatch(3) define them —
 * each one `@ac-kit/core`'s predicate for the C function of the same name.
 *
 * Predicates rather than a table of code-unit spans, so `[[:punct:]]` here and
 * `ispunct` everywhere else in the tree cannot drift apart. Where `punct` stops
 * and `graph` starts is exactly the sort of boundary a hand-written table gets
 * subtly wrong.
 */
const POSIX_CLASS_PREDICATES_: Readonly<
	Record<GlobPosixClassName, (code: number) => boolean>
> = {
	alnum: isAsciiAlphaNumeric,
	alpha: isAsciiAlpha,
	blank: isAsciiBlank,
	cntrl: isAsciiControl,
	digit: isAsciiDigit,
	graph: isAsciiGraphic,
	lower: isAsciiLowerAlpha,
	print: isAsciiPrintable,
	punct: isAsciiPunctuation,
	space: isAsciiWhitespace,
	upper: isAsciiUpperAlpha,
	xdigit: isAsciiHexDigit,
};

const POSIX_CLASS_NAMES_ = Object.keys(
	POSIX_CLASS_PREDICATES_,
) as GlobPosixClassName[];

/** The largest code unit any of these classes can hold. */
const LAST_ASCII_ = 0x7f;

function scanClass(predicate: (code: number) => boolean): CharSet {
	const members: number[] = [];

	for (let code = 0; code <= LAST_ASCII_; code++) {
		if (predicate(code)) {
			members.push(code, code);
		}
	}

	// `normalizeCharSet` coalesces adjacent code units, so the singletons collapse
	// back into the spans a class is actually made of.
	return normalizeCharSet(members);
}

/**
 * Both backends want the ranges rather than the predicate — the native `RegExp`
 * one emits `\uXXXX-\uYYYY` spans and the Pike-VM one splits the alphabet at
 * class boundaries — so each class is scanned once at module load, over the 128
 * code units it can possibly hold.
 */
const POSIX_CLASS_SETS_ = Object.fromEntries(
	POSIX_CLASS_NAMES_.map((name) => [
		name,
		scanClass(POSIX_CLASS_PREDICATES_[name]),
	]),
) as Record<GlobPosixClassName, CharSet>;

/** Whether `name` is one of the twelve POSIX class names. */
export function isGlobPosixClassName(name: string): name is GlobPosixClassName {
	return (POSIX_CLASS_NAMES_ as string[]).includes(name);
}

/** The code units one POSIX class holds. */
export function posixClassCharSet(name: GlobPosixClassName): CharSet {
	return POSIX_CLASS_SETS_[name];
}
