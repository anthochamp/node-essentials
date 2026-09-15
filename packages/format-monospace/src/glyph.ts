/**
 * Named symbols with an ASCII fallback, for fixed-width output.
 *
 * Names are typographic (`star`, `triangleUp`), never semantic (`winner`,
 * `error`): what a symbol _means_ depends on the thing being rendered, and a
 * layout package has no opinion on it. A consumer maps its own roles onto these
 * — `@ac-kit/app-terminal` does exactly that, resolving `Terminal.unicode`.
 *
 * Every Unicode glyph here is one column wide as {@link visibleWidth} measures
 * it, which counts East Asian Wide and Fullwidth as two and everything else as
 * one. Two consequences for anything added later:
 *
 * - Most of the useful symbol space (U+2190–2BFF) is East Asian **Ambiguous**,
 *   rendered one column by every terminal that does not assume a CJK locale.
 *   That is the convention `visibleWidth` implements, so these agree — but a
 *   terminal configured for Ambiguous-as-wide will render them two columns and
 *   misalign a table. There is no narrower substitute for an arrow or a
 *   triangle; the ASCII variants exist for exactly that case.
 * - **Never add a code point with `Emoji_Presentation=Yes`, and never append
 *   U+FE0F.** Either makes a terminal render the glyph as a two-column emoji
 *   while `visibleWidth` still reports one. `⚠` and `✖` are included because
 *   their default presentation is text; adding the variation selector would
 *   break them.
 */

/** Which repertoire a terminal (or a test) can render. */
export type GlyphStyle = "unicode" | "ascii";

/**
 * A pair of renderings for one symbol.
 *
 * The ASCII form is chosen for recognisability at one column, not for
 * similarity: a terminal that cannot draw `▲` is not helped by `A`.
 */
type GlyphPair_ = readonly [unicode: string, ascii: string];

const GLYPHS_ = {
	// Status and severity.
	check: ["✓", "+"],
	cross: ["✗", "x"],
	heavyCross: ["✖", "X"],
	warningSign: ["⚠", "!"],
	info: ["ℹ", "i"],
	question: ["?", "?"],

	// Marks and emphasis.
	star: ["★", "*"],
	starOutline: ["☆", "o"],
	bullet: ["•", "-"],
	middleDot: ["·", "."],
	circleFilled: ["●", "O"],
	circleOutline: ["○", "o"],
	squareFilled: ["■", "#"],
	squareOutline: ["□", "["],
	diamond: ["◆", "<"],
	flag: ["⚑", "F"],
	lock: ["⚿", "@"],

	// Triangles, which double as trend indicators.
	triangleUp: ["▲", "^"],
	triangleDown: ["▼", "v"],
	triangleLeft: ["◀", "<"],
	triangleRight: ["▶", ">"],
	pointerRight: ["❯", ">"],

	// Arrows.
	arrowUp: ["↑", "^"],
	arrowDown: ["↓", "v"],
	arrowLeft: ["←", "<"],
	arrowRight: ["→", ">"],
	arrowUpDown: ["↕", "|"],
	arrowLeftRight: ["↔", "-"],
	arrowCurveRight: ["↳", ">"],

	// Mathematical and comparison symbols, for numeric columns.
	plusMinus: ["±", "+/-"],
	times: ["×", "x"],
	divide: ["÷", "/"],
	approximately: ["≈", "~"],
	notEqual: ["≠", "!="],
	lessOrEqual: ["≤", "<="],
	greaterOrEqual: ["≥", ">="],
	infinity: ["∞", "inf"],
	degree: ["°", "deg"],
	permille: ["‰", "o/oo"],

	// Punctuation a fixed-width renderer reaches for.
	ellipsis: ["…", "..."],
	enDash: ["–", "-"],
	emDash: ["—", "--"],
	quoteLeft: ["“", '"'],
	quoteRight: ["”", '"'],

	// Blocks and shading, for bar charts and progress.
	blockFull: ["█", "#"],
	blockSevenEighths: ["▉", "#"],
	blockThreeQuarters: ["▊", "#"],
	blockFiveEighths: ["▋", "="],
	blockHalf: ["▌", "="],
	blockThreeEighths: ["▍", "="],
	blockQuarter: ["▎", "-"],
	blockEighth: ["▏", "-"],
	blockLower: ["▄", "_"],
	shadeLight: ["░", "."],
	shadeMedium: ["▒", ":"],
	shadeDark: ["▓", "="],

	// Box drawing, for anything framing its own output.
	lineHorizontal: ["─", "-"],
	lineVertical: ["│", "|"],
	cornerTopLeft: ["┌", "+"],
	cornerTopRight: ["┐", "+"],
	cornerBottomLeft: ["└", "+"],
	cornerBottomRight: ["┘", "+"],
	teeLeft: ["┤", "+"],
	teeRight: ["├", "+"],
	teeUp: ["┴", "+"],
	teeDown: ["┬", "+"],
	lineCross: ["┼", "+"],
	treeBranch: ["├─", "|-"],
	treeLast: ["└─", "`-"],
	treeTrunk: ["│ ", "| "],
} as const satisfies Readonly<Record<string, GlyphPair_>>;

export type GlyphName = keyof typeof GLYPHS_;

/** Every name in the inventory, for a picker or a test that walks them all. */
export const GLYPH_NAMES = Object.keys(GLYPHS_) as readonly GlyphName[];

/**
 * One symbol in the requested repertoire.
 *
 * @param style Defaults to `"unicode"`.
 */
export function glyph(name: GlyphName, style: GlyphStyle = "unicode"): string {
	return GLYPHS_[name][style === "ascii" ? 1 : 0];
}

/**
 * An animated sequence, cycled by {@link spinnerGlyph}.
 *
 * Frames of one sequence are all the same width, so a spinner never shifts the
 * text beside it.
 */
export type SpinnerName = keyof typeof SPINNERS_;

const SPINNERS_ = {
	/** Braille dots — the densest, and the least legible without antialiasing. */
	dots: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
	line: ["|", "/", "-", "\\"],
	arc: ["◜", "◠", "◝", "◞", "◡", "◟"],
	circleQuarters: ["◴", "◵", "◶", "◷"],
	circleHalves: ["◐", "◓", "◑", "◒"],
	bounce: ["⠁", "⠂", "⠄", "⠂"],
	grow: ["▁", "▃", "▄", "▅", "▆", "▇", "▆", "▅", "▄", "▃"],
	toggle: ["■", "□"],
	arrows: ["←", "↖", "↑", "↗", "→", "↘", "↓", "↙"],
	/** ASCII fallback for every sequence above. */
	ascii: ["|", "/", "-", "\\"],
} as const satisfies Readonly<Record<string, readonly string[]>>;

/** The frames of one animated sequence, in order. */
export function spinnerFrames(name: SpinnerName): readonly string[] {
	return SPINNERS_[name];
}
