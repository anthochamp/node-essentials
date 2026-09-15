import { Value } from "@ac-kit/model-dataset";

/** Reductions a transform may apply to a group of rows. */
export type AggregateOp =
	| "count"
	| "distinct"
	| "sum"
	| "mean"
	| "median"
	| "min"
	| "max"
	| "variance"
	| "stdev"
	| "q1"
	| "q3";

/**
 * Binning is declared, never pre-applied.
 *
 * A frame that already carries buckets cannot be re-fitted: an eighty-column
 * terminal, a 1200 px canvas and an eight-cell sparkline each want a different
 * bucket count. Carrying the raw values plus this intent lets each renderer
 * choose.
 */
export type BinTransform = {
	kind: "bin";
	field: string;
	/** Upper bound on bucket count. The renderer picks a nice width under it. */
	maxBins?: number;
	/** Exact bucket width, overriding `maxBins`. */
	step?: number;
	/** Bucket-width rule when neither is given. Default `"freedman-diaconis"`. */
	rule?: "sturges" | "scott" | "freedman-diaconis";
	/** Names for the two bound fields the transform produces. */
	as?: readonly [string, string];
};

/**
 * Collapses each group of rows to one row, applying the named reductions.
 *
 * `groupBy` names the fields that define a group; an empty list reduces the
 * whole frame to a single row.
 */
export type AggregateTransform = {
	kind: "aggregate";
	/** Fields to group by. Empty groups the whole frame into one row. */
	groupBy: readonly string[];
	ops: readonly { op: AggregateOp; field?: string; as: string }[];
};

/**
 * Turns overlapping values into contiguous ones: the difference between a
 * grouped bar chart and a stacked one, and between an area chart and a
 * streamgraph.
 */
export type StackTransform = {
	kind: "stack";
	field: string;
	groupBy: readonly string[];
	/** `"zero"` stacks from a baseline, `"normalize"` to a share of one. */
	offset?: "zero" | "normalize" | "center";
	as?: readonly [string, string];
};

/**
 * Reorders rows, which for a categorical axis is also what orders the axis.
 *
 * Declared rather than pre-applied, because a frame sorted for one chart is
 * sorted wrongly for the next one drawn from it.
 */
export type SortTransform = {
	kind: "sort";
	by: readonly { field: string; order?: "ascending" | "descending" }[];
};

/**
 * Keeps only the rows matching one comparison.
 *
 * `value` is omitted for `not-null`, and is an array for `in`.
 */
export type FilterTransform = {
	kind: "filter";
	field: string;
	op: "=" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "not-null";
	value?: Value | readonly Value[];
};

/** Kernel density estimate over one continuous field. */
export type DensityTransform = {
	kind: "density";
	field: string;
	groupBy?: readonly string[];
	bandwidth?: number;
	/** Sample count across the domain. Default is renderer-chosen. */
	steps?: number;
	as?: readonly [string, string];
};

/**
 * Fits a trend line through a scatter of points.
 *
 * `method` names the shape being fitted, `order` the degree when that shape is
 * a polynomial. The fit is an assertion about the data, not a reading of it,
 * which is why it is a transform and not a second frame.
 */
export type RegressionTransform = {
	kind: "regression";
	x: string;
	y: string;
	method?: "linear" | "log" | "exp" | "pow" | "quad" | "poly" | "loess";
	order?: number;
	groupBy?: readonly string[];
};

/** Running reduction over an ordered window: cumulative sums, moving averages. */
export type WindowTransform = {
	kind: "window";
	ops: readonly {
		op: AggregateOp | "rank" | "lag" | "lead";
		field?: string;
		as: string;
	}[];
	sort?: readonly { field: string; order?: "ascending" | "descending" }[];
	groupBy?: readonly string[];
	/** `[before, after]` row counts; `null` means unbounded on that side. */
	frame?: readonly [number | null, number | null];
};

/** Isolines or isobands over a two-dimensional scalar field. */
export type ContourTransform = {
	kind: "contour";
	x: string;
	y: string;
	weight?: string;
	thresholds?: readonly number[];
	as?: string;
};

/** Bins scattered points into equal-area cells, resolving overplotting. */
export type SpatialBinTransform = {
	kind: "spatial-bin";
	x: string;
	y: string;
	shape?: "rect" | "hex";
	/** Cell radius in domain units. */
	radius?: number;
	as?: readonly [string, string, string];
};

/**
 * A declarative step between the frame and the encoding.
 *
 * Transforms are data operations with names and complexities, so their
 * implementations live in `@ac-kit/math-stats`, `@ac-kit/math-grid` and
 * `@ac-kit/algo`; this vocabulary only says which one to apply.
 */
export type TransformSpec =
	| BinTransform
	| AggregateTransform
	| StackTransform
	| SortTransform
	| FilterTransform
	| DensityTransform
	| RegressionTransform
	| WindowTransform
	| ContourTransform
	| SpatialBinTransform;
