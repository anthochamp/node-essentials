/**
 * The geometric primitive drawn once per datum.
 *
 * A chart type is not a mark: a heatmap is `rect` with categorical position and
 * quantitative colour, a histogram is `bar` with a binned position, a
 * flamegraph is `rect` in hierarchical coordinates. Naming the primitive rather
 * than the chart is what keeps the catalogue open.
 */
export type Mark =
	/** One symbol per datum: scatter, bubble, strip. */
	| "point"
	/** Connected path through ordered data. */
	| "line"
	/** Filled region between a path and a baseline, or between two paths. */
	| "area"
	/** Rectangle anchored to a baseline. */
	| "bar"
	/** Rectangle defined by two positions on both axes: heatmap, raster, span. */
	| "rect"
	/** Circular sector: pie, donut, sunburst, gauge. */
	| "arc"
	/** Zero-width line: error bar, reference line, whisker. */
	| "rule"
	/** Short perpendicular dash: median marker, axis tick, event raster. */
	| "tick"
	/** A label positioned by the encoding. */
	| "text"
	/** An edge between two positions: node-link, arc diagram, Sankey ribbon. */
	| "link"
	/** A closed shape from a geometry field: choropleth, contour band. */
	| "polygon"
	/** A composite symbol whose form itself encodes data: wind barb, star plot. */
	| "glyph";
