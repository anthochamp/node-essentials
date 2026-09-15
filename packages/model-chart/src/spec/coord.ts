/**
 * Named map projections, by the family a reader would ask for.
 *
 * The projection mathematics is cartography and belongs in a `math/*` package;
 * this is the reference a spec carries so that a renderer able to project can
 * find one, and a renderer unable to project can decline cleanly.
 */
export type ProjectionKind =
	| "equirectangular"
	| "mercator"
	| "transverse-mercator"
	| "albers"
	| "albers-usa"
	| "conic-conformal"
	| "conic-equal-area"
	| "conic-equidistant"
	| "azimuthal-equal-area"
	| "azimuthal-equidistant"
	| "gnomonic"
	| "orthographic"
	| "stereographic"
	| "natural-earth"
	| "equal-earth";

/**
 * A projection, plus the parameters that decide what it centres on and where it
 * is least distorted.
 *
 * Every projection trades one kind of accuracy for another; `rotate`, `center`
 * and `parallels` choose which part of the map pays.
 */
export type ProjectionSpec = {
	kind: ProjectionKind;
	/** Rotation about the three axes, in degrees. */
	rotate?: readonly [number, number] | readonly [number, number, number];
	/** Standard parallels, for the conic families. */
	parallels?: readonly [number, number];
	/** Centre of the projection, as `[longitude, latitude]`. */
	center?: readonly [number, number];
};

/** How a tree's nodes are turned into positions. */
/**
 * How a tree is laid out in the plane: nested rectangles (`squarify`,
 * `partition`), a node-link diagram (`tidy`, `cluster`), or nested circles
 * (`pack`).
 */
export type HierarchyLayout =
	/** Nested rectangles, area-proportional: treemap. */
	| "squarify"
	/** Stacked bars along one axis: icicle, flamegraph, sunburst. */
	| "partition"
	/** Node-link, tidy: dendrogram. */
	| "tidy"
	/** Node-link, leaves aligned: cluster. */
	| "cluster"
	/** Nested circles. */
	| "pack";

/** How a graph's nodes are turned into positions. */
/**
 * How a graph is laid out: by simulated repulsion (`force`), by dependency
 * depth (`layered`), or by placing nodes on a fixed path (`circular`, `arc`,
 * `flow`).
 */
export type NetworkLayout =
	/** Force-directed, velocity Verlet. */
	| "force"
	/** Layered, for a directed acyclic graph. */
	| "layered"
	/** Nodes on a circle, edges as chords. */
	| "circular"
	/** Nodes on a line, edges as arcs. */
	| "arc"
	/** Flow-conserving ribbons: Sankey, alluvial. */
	| "flow";

/**
 * The space marks are placed in.
 *
 * Cartesian is the default and covers most of the catalogue. The other four
 * exist because they need something cartesian cannot supply: an angular sweep,
 * a map projection, one axis per field, or a layout algorithm that derives
 * positions from structure rather than from values.
 */
export type CoordSpec =
	| { kind: "cartesian"; transpose?: boolean }
	| {
			kind: "polar";
			innerRadius?: number;
			startAngle?: number;
			endAngle?: number;
	  }
	| { kind: "geographic"; projection: ProjectionSpec; crs?: string }
	| { kind: "parallel" }
	| { kind: "hierarchy"; layout: HierarchyLayout; padding?: number }
	| { kind: "network"; layout: NetworkLayout };

/** The discriminant of {@link CoordSpec}, for a renderer declaring its limits. */
export type CoordKind = CoordSpec["kind"];
