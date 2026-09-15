import type { GlyphStyle, SpinnerName } from "./glyph.js";
import { spinnerFrames } from "./glyph.js";

export type SpinnerOptions = {
	/** Default `"unicode"`. */
	style?: GlyphStyle;

	/** Which sequence to cycle. Ignored when `style` is `"ascii"`. */
	sequence?: SpinnerName;

	/** Frame duration in milliseconds. Default `100`. */
	intervalMs?: number;

	/**
	 * Function returning the current timestamp in milliseconds. Defaults to
	 * `Date.now()`.
	 */
	getTimestamp?: () => number;
};

/**
 * The spinner glyph for the current moment, cycling through a fixed frame set
 * every `intervalMs`.
 *
 * Stateless: driven by the wall clock rather than a call counter, so any number
 * of independent callers redrawing at their own cadence see the same glyph at
 * the same moment, with nothing to construct or track between calls.
 */
export function spinnerGlyph(options?: Readonly<SpinnerOptions>): string {
	const getTimestamp = options?.getTimestamp ?? Date.now;
	const intervalMs = options?.intervalMs ?? 100;

	const frames = spinnerFrames(
		options?.style === "ascii" ? "ascii" : (options?.sequence ?? "dots"),
	);
	return frames[Math.floor(getTimestamp() / intervalMs) % frames.length]!;
}
