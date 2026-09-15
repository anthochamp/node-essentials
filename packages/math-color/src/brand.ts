declare const _spaceTag: unique symbol;

/**
 * Tags a colour coordinate struct with a concrete colour space identifier,
 * yielding a zero-runtime-cost phantom type.
 *
 * The `_spaceTag` key is declared with `declare const` so it never exists at
 * runtime. Construction always requires an explicit `as` cast, which is the
 * intended seam: only conversion functions that know which space they produce
 * may create tagged values.
 *
 * @example
 * 	type Oklab = InSpace<LabCoords, "oklab">;
 */
export type InSpace<Model, S extends string> = Model & {
	readonly [_spaceTag]: S;
};

/**
 * Adds an optional alpha channel to any colour type.
 *
 * When absent, callers should treat the colour as fully opaque (alpha = 1).
 */
export type WithAlpha<T> = T & { alpha?: number };
