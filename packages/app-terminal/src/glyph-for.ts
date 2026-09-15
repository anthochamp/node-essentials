import type { GlyphName } from "@ac-kit/format-monospace";
import { glyph } from "@ac-kit/format-monospace";

import type { Terminal } from "./terminal.js";

/**
 * What a symbol means in a rendered report, independent of which character
 * draws it.
 *
 * The layer that keeps `@ac-kit/format-monospace` free of vocabulary it has no
 * business owning: it ships `star` and `triangleUp`, this decides that a winner
 * is a star. Same split as colour, where the palette names roles and
 * `@ac-kit/math-color` only knows values.
 */
export type GlyphRole =
	| "winner"
	| "success"
	| "failure"
	| "warning"
	| "error"
	| "info"
	| "better"
	| "worse"
	| "unchanged"
	| "pending"
	| "bullet"
	| "more";

const ROLE_GLYPHS: Readonly<Record<GlyphRole, GlyphName>> = {
	winner: "star",
	success: "check",
	failure: "cross",
	warning: "warningSign",
	error: "heavyCross",
	info: "info",
	better: "triangleDown",
	worse: "triangleUp",
	unchanged: "middleDot",
	pending: "circleOutline",
	bullet: "bullet",
	more: "ellipsis",
};

/**
 * The symbol for `role`, in whichever repertoire the terminal can render.
 *
 * `better` and `worse` are drawn as **down** and **up** triangles: the roles
 * name the judgement, not the direction, so a higher-is-better measure passes
 * `better` for a rise and still gets the glyph its readers associate with good
 * news. A renderer that means "the number went up" wants `triangleUp` from the
 * inventory directly.
 */
export function glyphFor(terminal: Terminal, role: GlyphRole): string {
	return glyph(ROLE_GLYPHS[role], terminal.unicode ? "unicode" : "ascii");
}
