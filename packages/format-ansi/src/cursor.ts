import { ESC_CHAR } from "@ac-kit/core";

/** Moves the cursor up `count` rows. A no-op string when `count` is `0`. */
export function cursorUp(count: number): string {
	return count > 0 ? `${ESC_CHAR}[${count}A` : "";
}

/** Moves the cursor down `count` rows. A no-op string when `count` is `0`. */
export function cursorDown(count: number): string {
	return count > 0 ? `${ESC_CHAR}[${count}B` : "";
}

/** Erases from the cursor to the end of the screen. */
export const ERASE_FROM_CURSOR_TO_END = `${ESC_CHAR}[0J` as const;

/** Erases the entire current line. */
export const ERASE_LINE = `${ESC_CHAR}[2K` as const;

/** Erases the whole screen and its scrollback, then moves the cursor home. */
export const CLEAR_SCREEN =
	`${ESC_CHAR}[2J${ESC_CHAR}[3J${ESC_CHAR}[H` as const;

/** Hides the text cursor. */
export const HIDE_CURSOR = `${ESC_CHAR}[?25l` as const;

/** Shows the text cursor. */
export const SHOW_CURSOR = `${ESC_CHAR}[?25h` as const;

/** Switches to the terminal's alternate screen buffer. */
export const ENTER_ALT_SCREEN = `${ESC_CHAR}[?1049h` as const;

/** Switches back to the terminal's primary screen buffer. */
export const EXIT_ALT_SCREEN = `${ESC_CHAR}[?1049l` as const;
