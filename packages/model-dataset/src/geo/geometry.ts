/**
 * A position in a coordinate reference system, as `[x, y]` — longitude first
 * for a geographic CRS, matching GeoJSON (RFC 7946 §3.1.1). A third element is
 * elevation.
 */
export type GeoPosition =
	| readonly [number, number]
	| readonly [number, number, number];

export type GeoPoint = { type: "Point"; coordinates: GeoPosition };
export type GeoMultiPoint = {
	type: "MultiPoint";
	coordinates: readonly GeoPosition[];
};
export type GeoLineString = {
	type: "LineString";
	coordinates: readonly GeoPosition[];
};
export type GeoMultiLineString = {
	type: "MultiLineString";
	coordinates: readonly (readonly GeoPosition[])[];
};
/** First ring is the exterior; any further rings are holes. */
export type GeoPolygon = {
	type: "Polygon";
	coordinates: readonly (readonly GeoPosition[])[];
};
export type GeoMultiPolygon = {
	type: "MultiPolygon";
	coordinates: readonly (readonly (readonly GeoPosition[])[])[];
};
export type GeoGeometryCollection = {
	type: "GeometryCollection";
	geometries: readonly Geometry[];
};

/**
 * A shape in a coordinate reference system, in GeoJSON's geometry vocabulary
 * (RFC 7946 §3.1).
 *
 * The CRS itself is not carried here: RFC 7946 fixes it to WGS 84 for
 * interchange, and a dataset using another one declares it once on the geometry
 * field rather than on every cell.
 */
export type Geometry =
	| GeoPoint
	| GeoMultiPoint
	| GeoLineString
	| GeoMultiLineString
	| GeoPolygon
	| GeoMultiPolygon
	| GeoGeometryCollection;
