/**
 * Global tolerance defaults for the geometry module.
 *
 * Every predicate that needs a tolerance accepts one per call and falls back
 * here only when none is given. Users may mutate these fields freely at
 * runtime.
 *
 * The split between a linear and an angular tolerance follows the CAD kernels —
 * OpenCASCADE's `Precision::Confusion()` and `Precision::Angular()`, ACIS's
 * `SPAresabs` and `SPAresnor` — because the two quantities are not
 * interchangeable: one is a length in the caller's units, the other is
 * dimensionless.
 *
 * ```ts
 * import { geometryConfig } from "@ac-kit/math-geometry";
 *
 * // Working in millimetres rather than metres
 * geometryConfig.defaultLinearTolerance = 1e-6;
 * ```
 *
 * These are process-global and mutable: two libraries sharing one process
 * cannot disagree, and a change applies to every later call. Pass a tolerance
 * explicitly wherever that matters.
 */
export const geometryConfig: {
	/**
	 * Largest distance, in the caller's own units, at which two positions still
	 * count as coincident — the bound for incidence predicates such as
	 * `plane3ContainsPoint` and `line2ContainsPoint`, where an exact test is
	 * useless because a constructed point never lands exactly on a plane.
	 *
	 * Default: `1e-9`.
	 */
	defaultLinearTolerance: number;
	/**
	 * Largest dimensionless residual at which a direction still counts as
	 * degenerate — the bound for the parallel and near-zero guards that protect a
	 * division or a normalisation, such as `line2Intersect`'s denominator.
	 *
	 * Dimensionless, so it is compared against a quantity already scaled by the
	 * operands' magnitudes rather than against a raw length.
	 *
	 * Default: `1e-10`.
	 */
	defaultAngularTolerance: number;
} = {
	defaultLinearTolerance: 1e-9,
	defaultAngularTolerance: 1e-10,
};
