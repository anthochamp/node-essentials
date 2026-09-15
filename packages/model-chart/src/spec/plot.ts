import type { AnnotationSpec } from "./annotation.js";
import type { Channel } from "./channel.js";
import type { CoordSpec } from "./coord.js";
import type { EncodingSpec } from "./encoding.js";
import type { Mark } from "./mark.js";
import type { TransformSpec } from "./transform.js";

/** How consecutive points of a `line` or `area` mark are joined. */
/**
 * The path drawn between consecutive points of a line or area.
 *
 * `linear` joins them directly and claims nothing the data does not say. The
 * curved options assert that something continuous happened between the samples;
 * the `step` options assert that nothing did until the next one.
 */
export type Interpolation =
	| "linear"
	| "step"
	| "step-before"
	| "step-after"
	| "monotone"
	| "natural"
	| "basis"
	| "cardinal";

/**
 * One layer of marks over one frame.
 *
 * Deliberately free of geometry: no width, height, margin, pixel, cell, font or
 * colour literal appears anywhere in this type. The spec states intent; the
 * renderer owns every measurement. Anything expressed in output units would
 * make the spec renderable by exactly one adapter.
 */
export type PlotSpec = {
	mark: Mark;
	encoding: Partial<Record<Channel, EncodingSpec>>;
	/** Default `{ kind: "cartesian" }`. */
	coord?: CoordSpec;
	/** Applied in order, before the encoding is resolved. */
	transform?: readonly TransformSpec[];
	interpolate?: Interpolation;
	annotations?: readonly AnnotationSpec[];
	title?: string;
	/**
	 * Prose describing what the chart shows.
	 *
	 * Alt text for SVG and HTML, a screen-reader string, and the sentence a
	 * renderer emits when it declines the chart entirely — which is what makes
	 * declining acceptable rather than silent.
	 */
	description?: string;
	/** Preferred width-to-height ratio. A hint, never a size. */
	aspectRatio?: number;
	/**
	 * Specs to try, in order, when a renderer cannot draw this one.
	 *
	 * A pie falls back to a normalized stacked bar, a scatter to a binned
	 * heatmap. When the list is exhausted the universal fallback applies: render
	 * the underlying frame as a table.
	 */
	fallback?: readonly PlotSpec[];
};

/** Small multiples: one plot repeated over the distinct values of a field. */
export type FacetSpec = {
	kind: "facet";
	row?: string;
	column?: string;
	plot: PlotSpec;
	/** Whether facets share one scale per channel. Default `true`. */
	sharedScales?: boolean;
};

/** Several marks in one coordinate space, sharing scales. */
export type LayerSpec = {
	kind: "layer";
	layers: readonly PlotSpec[];
	coord?: CoordSpec;
	title?: string;
	description?: string;
};

/** Independent plots side by side, each with its own scales. */
export type ConcatSpec = {
	kind: "concat";
	direction: "horizontal" | "vertical" | "wrap";
	views: readonly ViewSpec[];
	title?: string;
	description?: string;
};

/** A single plot, or any composition of them. */
export type ViewSpec =
	| ({ kind: "plot" } & PlotSpec)
	| LayerSpec
	| FacetSpec
	| ConcatSpec;
