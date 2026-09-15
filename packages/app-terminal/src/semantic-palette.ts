import type { SgrStyleName } from "@ac-kit/format-ansi";
import type { Rgb8 } from "@ac-kit/math-color";

import { styleTextFor } from "./style-text-for.js";
import type { Terminal } from "./terminal.js";

/**
 * What a piece of text means, rather than what colour it should be.
 *
 * Shares its vocabulary with {@link GlyphRole} wherever the two overlap, so a
 * glyph and the colour beside it are asked for by the same name. Roles a glyph
 * has no answer for (`muted`, `critical`) and glyphs no colour applies to
 * (`bullet`, `more`) are why the two are separate lists rather than one.
 */
export type SemanticRole =
	/** De-emphasised: a detail, a value not settled yet, a row still running. */
	| "muted"
	| "info"
	| "success"
	| "warning"
	| "error"
	/** Severe enough to take a background rather than only a foreground. */
	| "critical"
	| "winner"
	| "better"
	| "worse"
	| "unchanged";

/**
 * Colour alone — SGR attributes stay at the call site.
 *
 * `bold` on a log level's label and `bold` on a table's winning row are the
 * caller's emphasis decisions, not properties of what the text means, and
 * baking them in would make a palette impossible to reuse across the two.
 */
export type SemanticStyle = {
	readonly foreground?: Rgb8;
	readonly background?: Rgb8;
};

export type SemanticPalette = Readonly<Record<SemanticRole, SemanticStyle>>;

/**
 * The default palette.
 *
 * Chosen for a dark background. Pass a palette of your own to
 * {@link styleSemanticFor}/{@link semanticStyle} for a light one.
 */
export const SEMANTIC_PALETTE: SemanticPalette = {
	muted: { foreground: { r8: 128, g8: 128, b8: 128 } },
	info: { foreground: { r8: 88, g8: 166, b8: 255 } },
	success: { foreground: { r8: 0, g8: 200, b8: 0 } },
	warning: { foreground: { r8: 220, g8: 180, b8: 0 } },
	error: { foreground: { r8: 220, g8: 50, b8: 47 } },
	critical: {
		foreground: { r8: 255, g8: 255, b8: 255 },
		background: { r8: 180, g8: 0, b8: 0 },
	},
	winner: { foreground: { r8: 255, g8: 215, b8: 0 } },
	better: { foreground: { r8: 0, g8: 200, b8: 0 } },
	worse: { foreground: { r8: 220, g8: 50, b8: 47 } },
	unchanged: { foreground: { r8: 128, g8: 128, b8: 128 } },
};

/** The colour a role carries, for a caller that styles text itself. */
export function semanticStyle(
	role: SemanticRole,
	palette: SemanticPalette = SEMANTIC_PALETTE,
): SemanticStyle {
	return palette[role];
}

export type StyleSemanticOptions = {
	/** SGR attributes to apply alongside the role's colour. */
	readonly styles?: readonly SgrStyleName[];
	readonly palette?: SemanticPalette;
};

/** Styles `text` as `role`, downsampled to what `terminal` can render. */
export function styleSemanticFor(
	terminal: Terminal,
	text: string,
	role: SemanticRole,
	options?: StyleSemanticOptions,
): string {
	return styleTextFor(terminal, text, {
		...semanticStyle(role, options?.palette),
		styles: options?.styles,
	});
}
