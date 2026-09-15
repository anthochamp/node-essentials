import { Vec3 } from "@ac-kit/math-linear";

import {
	CylindricalCoordsY,
	CylindricalCoordsZ,
	SphericalCoordsY,
	SphericalCoordsZ,
} from "./coordinates.js";

export function vec3ToCylindricalY(v: Vec3): CylindricalCoordsY {
	return {
		radius: Math.hypot(v[0], v[2]),
		azimuth: Math.atan2(v[2], v[0]),
		height: v[1],
	} as CylindricalCoordsY;
}

export function cylindricalYToVec3(coords: CylindricalCoordsY): Vec3 {
	return [
		coords.radius * Math.cos(coords.azimuth),
		coords.height,
		coords.radius * Math.sin(coords.azimuth),
	];
}

export function vec3ToSphericalY(v: Vec3): SphericalCoordsY {
	const radius = Math.hypot(v[0], v[1], v[2]);
	return {
		radius,
		azimuth: Math.atan2(v[2], v[0]),
		inclination: Math.acos(v[1] / radius),
	} as SphericalCoordsY;
}

export function sphericalYToVec3(coords: SphericalCoordsY): Vec3 {
	const sinI = Math.sin(coords.inclination);
	return [
		coords.radius * sinI * Math.cos(coords.azimuth),
		coords.radius * Math.cos(coords.inclination),
		coords.radius * sinI * Math.sin(coords.azimuth),
	];
}

export function vec3ToCylindricalZ(v: Vec3): CylindricalCoordsZ {
	return {
		radius: Math.hypot(v[0], v[1]),
		azimuth: Math.atan2(v[1], v[0]),
		height: v[2],
	} as CylindricalCoordsZ;
}

export function cylindricalZToVec3(coords: CylindricalCoordsZ): Vec3 {
	return [
		coords.radius * Math.cos(coords.azimuth),
		coords.radius * Math.sin(coords.azimuth),
		coords.height,
	];
}

export function vec3ToSphericalZ(v: Vec3): SphericalCoordsZ {
	const radius = Math.hypot(v[0], v[1], v[2]);
	return {
		radius,
		azimuth: Math.atan2(v[1], v[0]),
		inclination: Math.acos(v[2] / radius),
	} as SphericalCoordsZ;
}

export function sphericalZToVec3(coords: SphericalCoordsZ): Vec3 {
	const sinI = Math.sin(coords.inclination);
	return [
		coords.radius * sinI * Math.cos(coords.azimuth),
		coords.radius * sinI * Math.sin(coords.azimuth),
		coords.radius * Math.cos(coords.inclination),
	];
}
