import { mod } from "@ac-kit/core";
import { Vec2 } from "@ac-kit/math-linear";
import { TWO_PI } from "@ac-kit/math-scalar";

import {
	PolarCoords,
	PolygonalPolarCoords,
	PolygonalPolarSystem,
} from "./coordinates.js";

export function vec2ToPolar(v: Vec2): PolarCoords {
	const radius = Math.hypot(v[0], v[1]);
	const angle = Math.atan2(v[1], v[0]);
	return { radius, angle };
}

export function polarToVec2(coords: PolarCoords): Vec2 {
	return [
		coords.radius * Math.cos(coords.angle),
		coords.radius * Math.sin(coords.angle),
	];
}

export function vec2ToPolygonalPolar(
	v: Vec2,
	system: PolygonalPolarSystem,
): PolygonalPolarCoords {
	const euclideanDist = Math.hypot(v[0], v[1]);
	const angle = Math.atan2(v[1], v[0]);

	// φ: offset from the nearest sector bisector, range [-π/n, π/n)
	const sectorAngle = TWO_PI / system.sides;
	const halfSector = sectorAngle / 2;
	const normalizedOffset = mod(angle - system.rotation, sectorAngle);
	const phi = normalizedOffset - halfSector;

	// boundaryDist = cos(π/n) / cos(φ)  →  radius = euclideanDist / boundaryDist
	const radius = (euclideanDist * Math.cos(phi)) / Math.cos(halfSector);

	return { system, radius, angle };
}

export function polygonalPolarToVec2(coords: PolygonalPolarCoords): Vec2 {
	const { radius, angle, system } = coords;

	const sectorAngle = TWO_PI / system.sides;
	const halfSector = sectorAngle / 2;
	const normalizedOffset = mod(angle - system.rotation, sectorAngle);
	const phi = normalizedOffset - halfSector;

	const euclideanDist = (radius * Math.cos(halfSector)) / Math.cos(phi);

	return [euclideanDist * Math.cos(angle), euclideanDist * Math.sin(angle)];
}
