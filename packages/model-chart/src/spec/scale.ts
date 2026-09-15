import { Value } from "@ac-kit/model-dataset";

/**
 * How a field's values map onto a channel's positions.
 *
 * A scale declares a **domain** and never a range: the range is pixels, cells
 * or radians, and only the renderer knows which. This is the single rule that
 * lets one spec drive a canvas and an eighty-column terminal.
 */
export type ScaleKind =
	| "linear"
	| "log"
	| "pow"
	| "sqrt"
	| "symlog"
	| "time"
	/** Discrete input, discrete output: a colour per category. */
	| "ordinal"
	/** Discrete input, contiguous bands: the usual bar-chart position scale. */
	| "band"
	/** Discrete input, points with no width: a categorical scatter axis. */
	| "point"
	/** Continuous input, discrete output, by equal-count buckets. */
	| "quantile"
	/** Continuous input, discrete output, by equal-width buckets. */
	| "quantize"
	/** Continuous input, discrete output, at caller-supplied cut points. */
	| "threshold"
	/** Values pass through unmapped; the field is already in output terms. */
	| "identity";

/**
 * A colour ramp named by intent, never by hex.
 *
 * A terminal with no colour maps a sequential scheme to a glyph ramp; a canvas
 * maps it to RGB. A literal colour in the spec forbids the first.
 */
export type ColorSchemeSpec = {
	kind: "categorical" | "sequential" | "diverging" | "cyclic";
	/** Well-known ramp name, e.g. `"viridis"`, `"tableau10"`, `"rdbu"`. */
	name?: string;
	reverse?: boolean;
	/** Where a diverging scheme's neutral colour sits. Default `0`. */
	midpoint?: number;
};

/**
 * One channel's mapping from data values to visual positions.
 *
 * Every field is optional: an omitted `kind` lets the renderer infer one from
 * the field's type, and an omitted `domain` lets it read the extent off the
 * data. Nothing here is expressed in output units — see {@link ScaleKind}.
 */
export type ScaleSpec = {
	kind?: ScaleKind;
	/**
	 * Explicit domain. Absent means "derive it from the data", which is what a
	 * renderer normally does.
	 */
	domain?: readonly Value[];
	/** Extends a derived numeric domain to include zero. */
	zero?: boolean;
	/** Rounds a derived numeric domain outward to human-readable bounds. */
	nice?: boolean;
	/** Clamps out-of-domain values to the nearest bound instead of dropping them. */
	clamp?: boolean;
	/** Reverses the direction of the mapping. */
	reverse?: boolean;
	/** Exponent for `"pow"`. Default `1`. */
	exponent?: number;
	/** Base for `"log"`. Default `10`. */
	base?: number;
	/** Fraction of a band left empty between adjacent bands. `0` to `1`. */
	padding?: number;
	/** Colour channels only. */
	scheme?: ColorSchemeSpec;
};
