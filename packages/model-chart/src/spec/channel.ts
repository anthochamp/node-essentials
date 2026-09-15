/**
 * A visual property a field can drive.
 *
 * The channel set is what makes the catalogue open: a heatmap needs no new
 * type, only `x`/`y` categorical plus `color` quantitative.
 */
export type Channel =
	// Cartesian position. The `2` variants give a mark its second endpoint,
	// which is how a span, a bin, a Gantt bar and a candlestick are expressed
	// without an interval-valued field.
	| "x"
	| "x2"
	| "y"
	| "y2"
	| "z"
	// Polar position.
	| "theta"
	| "theta2"
	| "radius"
	| "radius2"
	// Geographic position. `geometry` takes a whole shape; the pair takes
	// scalar coordinates.
	| "longitude"
	| "latitude"
	| "geometry"
	// Mark appearance.
	| "color"
	| "fill"
	| "stroke"
	| "strokeWidth"
	| "size"
	| "shape"
	| "opacity"
	// Text.
	| "text"
	| "tooltip"
	// Edges, for the `link` mark.
	| "source"
	| "target"
	// Grouping without a visual result of its own.
	| "detail"
	| "order"
	| "key"
	// Small multiples.
	| "row"
	| "column";

/** Channels that place a mark rather than style it. */
/**
 * The channels that place a mark rather than style it.
 *
 * A renderer uses this to tell "where does this go?" from "what does this look
 * like?" — a missing position is an error, a missing colour is a default.
 */
export const POSITION_CHANNELS: readonly Channel[] = [
	"x",
	"x2",
	"y",
	"y2",
	"z",
	"theta",
	"theta2",
	"radius",
	"radius2",
	"longitude",
	"latitude",
	"geometry",
];
