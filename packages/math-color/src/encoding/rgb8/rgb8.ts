/**
 * 8-bit gamma-encoded RGB, used at system boundaries (canvas, CSS, ImageData).
 *
 * The `r8/g8/b8` field prefixes are intentional: they prevent accidental mixing
 * with [0, 1] values without a brand.
 *
 * Values in [0, 255].
 */
export type Rgb8 = {
	r8: number;
	g8: number;
	b8: number;
};

/** {@link Rgb8} with an alpha channel in [0, 255]. */
export type Rgba8 = Rgb8 & { a8: number };

export const RGB8_BLACK = { r8: 0, g8: 0, b8: 0 } as const satisfies Rgb8;
export const RGB8_WHITE = { r8: 255, g8: 255, b8: 255 } as const satisfies Rgb8;
export const RGB8_GREY = { r8: 128, g8: 128, b8: 128 } as const satisfies Rgb8;
