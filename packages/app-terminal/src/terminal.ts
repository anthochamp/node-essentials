import type { IEventDispatcher } from "@ac-kit/async";
import { ColorDepth } from "@ac-kit/format-ansi";

/**
 * Terminal properties a rendering sink needs, injected rather than read from
 * `process.stdout` directly so the renderer stays portable and testable without
 * a pty. The Node adapter lives in `@ac-kit/app-system`.
 */
export type Terminal = {
	/** Whether the terminal is interactive (i.e., connected to a TTY). */
	interactive: boolean;

	/**
	 * Viewport width in columns. Load-bearing even outside a full-screen
	 * reporter: a live region wider than the viewport corrupts scrollback, so a
	 * renderer must clamp against it.
	 */
	columns: number;

	/**
	 * Viewport height. Load-bearing even outside a full-screen reporter: a live
	 * region taller than the viewport corrupts scrollback, so a renderer must
	 * clamp against it.
	 */
	rows: number;

	/** Color depth supported by the terminal. */
	colorDepth: ColorDepth;

	/** Whether the terminal supports Unicode characters. */
	unicode: boolean;

	/** Whether the terminal supports hyperlinks. */
	hyperlinks: boolean;

	/** Fires whenever `columns`/`rows` change. */
	resize: IEventDispatcher;

	/**
	 * Enter the alternate screen buffer. Present only on terminals that support
	 * it.
	 */
	enterAltScreen?(): void;
	/**
	 * Exit the alternate screen buffer. Present only on terminals that support
	 * it.
	 */
	exitAltScreen?(): void;

	/** Erases the screen and its scrollback. Present only when interactive. */
	clear?(): void;
};
