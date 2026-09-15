/**
 * The CSS `<color>` production as a syntax tree.
 *
 * Parsing keeps what was written rather than collapsing to one representation:
 * `oklch(70% 0.1 200)` and its sRGB approximation are different authored
 * values, `color-mix()` has operands that must survive to be mixed, and
 * relative colour syntax refers to channels of a colour it has not seen yet.
 * Evaluating happens in a separate step — see `resolveCssColor`.
 */

import type { CssColorName } from "./named-colors.js";

/**
 * One channel value as authored.
 *
 * `none` is a real CSS value, not an absence: it means "this channel carries no
 * information", which interpolation treats differently from zero.
 *
 * `calc()` is deliberately absent — it is a CSS value-level grammar, not part
 * of `<color>`, and belongs to a package that owns arithmetic over any
 * property.
 */
export type CssComponent =
	| { readonly kind: "number"; readonly value: number }
	| { readonly kind: "percentage"; readonly value: number }
	/** Radians. The unit a source used is not kept; a hue is a hue. */
	| { readonly kind: "angle"; readonly radians: number }
	| { readonly kind: "none" }
	/** A channel of the origin colour in relative colour syntax. */
	| { readonly kind: "channel"; readonly name: string };

/** Colour spaces `color()` can name, plus the polar and rectangular models. */
export type CssColorSpace =
	| "srgb"
	| "srgb-linear"
	| "display-p3"
	| "a98-rgb"
	| "prophoto-rgb"
	| "rec2020"
	| "xyz"
	| "xyz-d50"
	| "xyz-d65";

/** Which space `color-mix()` interpolates in. */
export type CssMixSpace =
	| CssColorSpace
	| "hsl"
	| "hwb"
	| "lab"
	| "lch"
	| "oklab"
	| "oklch";

/**
 * Functional notations that take three components plus an optional alpha.
 *
 * `rgba()` and `hsla()` are not members: they are the legacy spelling of the
 * same function, recorded by `legacy` and restored when printing.
 */
export type CssColorFunction =
	| "rgb"
	| "hsl"
	| "hwb"
	| "lab"
	| "lch"
	| "oklab"
	| "oklch";

export type CssAngleUnit = "deg" | "grad" | "rad" | "turn";

export type CssColor =
	/** `transparent`, which is `rgb(0 0 0 / 0)` with its own spelling. */
	| { readonly kind: "transparent" }
	/** `currentColor`, resolvable only against an inherited value. */
	| { readonly kind: "currentColor" }
	| { readonly kind: "named"; readonly name: CssColorName }
	/**
	 * `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`. `digits` is kept so printing can
	 * round-trip the authored form.
	 */
	| {
			readonly kind: "hex";
			readonly r8: number;
			readonly g8: number;
			readonly b8: number;
			readonly a8: number;
			readonly digits: 3 | 4 | 6 | 8;
	  }
	| {
			readonly kind: "function";
			readonly name: CssColorFunction;
			readonly components: readonly [CssComponent, CssComponent, CssComponent];
			readonly alpha: CssComponent | null;
			/** The `from` colour of relative colour syntax. */
			readonly origin: CssColor | null;
			/** Whether the source used the legacy comma form, for printing. */
			readonly legacy: boolean;
	  }
	| {
			readonly kind: "color";
			readonly space: CssColorSpace;
			readonly components: readonly [CssComponent, CssComponent, CssComponent];
			readonly alpha: CssComponent | null;
			readonly origin: CssColor | null;
	  }
	| {
			readonly kind: "mix";
			readonly space: CssMixSpace;
			readonly first: CssColor;
			/** Percentage in `[0, 100]`, or `null` for the implied half. */
			readonly firstWeight: number | null;
			readonly second: CssColor;
			readonly secondWeight: number | null;
	  };
