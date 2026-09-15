/** Polygonal polar coordinate system. */
export type PolygonalPolarSystem = {
	sides: number; // number of sides of the polygon
	rotation: number; // rotation of the polygon, range (-π, π]
};

/** Polygonal polar coordinates. */
export type PolygonalPolarCoords = {
	system: PolygonalPolarSystem;
	radius: number; // polygonal norm: 1 = on n-gon boundary, <1 = inside, >1 = outside
	angle: number; // angle from +x axis, range (-π, π]
};

/** Polar coordinates. */
export type PolarCoords = {
	radius: number; // Euclidean distance from origin
	angle: number; // angle from +x axis, range (-π, π]
};

declare const _sysTag: unique symbol;
type InSystem_<T, S extends string> = T & { readonly [_sysTag]: S };

/** Spherical coordinates. */
export type SphericalCoords = {
	radius: number; // distance from origin
	azimuth: number; // angle from the reference axis in the azimuthal plane, range (-π, π]
	inclination: number; // angle from the zenith axis, range [0, π]
};

/**
 * Spherical coordinates with Y-up (default in graphics): azimuth in XZ plane,
 * inclination from +y axis
 */
export type SphericalCoordsY = InSystem_<SphericalCoords, "y">;

/**
 * Spherical coordinates with Z-up (physics / ISO 80000-2): azimuth in XY plane,
 * inclination from +z axis
 */
export type SphericalCoordsZ = InSystem_<SphericalCoords, "z">;

/** Cylindrical coordinates. */
export type CylindricalCoords = {
	radius: number; // distance from the cylinder axis
	azimuth: number; // angle from the reference axis in the azimuthal plane, range (-π, π]
	height: number; // distance along the cylinder axis
};

/**
 * Cylindrical coordinates with Y-up (default in graphics): azimuth in XZ plane,
 * height along Y
 */
export type CylindricalCoordsY = InSystem_<CylindricalCoords, "y">;

/**
 * Cylindrical coordinates with Z-up (physics): azimuth in XY plane, height
 * along Z
 */
export type CylindricalCoordsZ = InSystem_<CylindricalCoords, "z">;
