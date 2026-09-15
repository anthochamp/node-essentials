import {
	cursorUp,
	ERASE_FROM_CURSOR_TO_END,
	stripAnsiEscapes,
} from "@ac-kit/format-ansi";
import { truncateToWidth, visibleWidth } from "@ac-kit/format-monospace";

import type { Terminal } from "./terminal.js";

/**
 * Whether text can be redrawn in place on this terminal.
 *
 * `cursorUp` counts rows, so the arithmetic only holds while every written line
 * occupies exactly one — which needs a width to clamp against — and while the
 * region stays within reach of the cursor, which needs a height.
 */
export function isRedrawable(terminal: Terminal): boolean {
	return terminal.interactive && terminal.columns > 0 && terminal.rows > 1;
}

/**
 * How many rows a live region may occupy on this terminal.
 *
 * One less than the viewport: the row the cursor rests on after the last line
 * is written belongs to the region too, and `cursorUp` cannot reach past the
 * top of the screen. A caller choosing _what_ to show budgets against this; the
 * region enforces it regardless.
 */
export function liveRegionHeight(terminal: Terminal): number {
	return Math.max(terminal.rows - 1, 0);
}

/**
 * Emits the next frame of a live region: erases whatever the previous call
 * wrote, appends any permanent lines, then draws the region again.
 *
 * @param region Redrawn in place, and erased by the following call.
 * @param scrollback Written above the region and kept.
 * @returns The text to write. Empty when there is nothing to do.
 */
export type LiveRegion = (
	region: readonly string[],
	scrollback?: readonly string[],
) => string;

/**
 * A live region bound to one terminal.
 *
 * Closes over the height of the last frame, which is the only thing that makes
 * the next erase correct — so one region owns one cursor position, and two
 * regions must never share a stream.
 *
 * Entries are split on newlines first: a caller renders one _item_ per entry —
 * an event, a whole table — and an entry holding two lines occupies two rows,
 * which the erase has to count and the clamp has to measure separately.
 *
 * Lines are clamped to the terminal's width, because a wrapped line occupies
 * two rows and leaves the erase one short; and the region is clamped to `rows -
 * 1`, because `cursorUp` cannot reach above the viewport and anything that
 * scrolled off would be stranded in scrollback. A region that overflows keeps
 * its **last** lines: those are the newest, and the ones it drops were never
 * written, so there is nothing left behind.
 *
 * Committing a finished region is the same operation with the finished text as
 * `scrollback` and an empty region.
 */
export function createLiveRegion(terminal: Terminal): LiveRegion {
	let previousHeight = 0;

	return (region, scrollback) => {
		const budget = liveRegionHeight(terminal);
		const lines = physicalLines_(region);
		const visible =
			lines.length > budget ? lines.slice(lines.length - budget) : lines;

		let output = previousHeight > 0 ? erase_(previousHeight) : "";
		for (const line of physicalLines_(scrollback ?? [])) {
			output += `${clamp_(line, terminal.columns)}\n`;
		}
		for (const line of visible) {
			output += `${clamp_(line, terminal.columns)}\n`;
		}

		previousHeight = visible.length;
		return output;
	};
}

/** One entry per row on screen, whatever the caller batched into a string. */
function physicalLines_(entries: readonly string[]): string[] {
	const lines: string[] = [];
	for (const entry of entries) {
		for (const line of entry.replace(/\n$/, "").split("\n")) {
			lines.push(line);
		}
	}
	return lines;
}

function erase_(height: number): string {
	return cursorUp(height) + ERASE_FROM_CURSOR_TO_END;
}

/**
 * `visibleWidth` strips control bytes but not the rest of an SGR sequence, so
 * `[38;2;220;50;47m` still counts as printable text — measuring a styled line
 * directly would cut a short line to nothing. Measure the stripped text, and
 * only lose the styling on a line that has to be cut anyway; a cut landing
 * inside a sequence would otherwise print its digits as text.
 */
function clamp_(line: string, columns: number): string {
	if (columns <= 0) {
		return line;
	}

	const stripped = stripAnsiEscapes(line);
	if (visibleWidth(stripped) <= columns) {
		return line;
	}
	return truncateToWidth(stripped, columns);
}
