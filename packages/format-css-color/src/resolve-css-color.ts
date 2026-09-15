import { clamp, mod } from "@ac-kit/core";
import type {
	InSpace,
	LabCoords,
	LchCoords,
	Oklab,
	Oklch,
	RgbProfile,
	SrgbLinear,
} from "@ac-kit/math-color";
import {
	CIE_D65_WHITE_POINT,
	ICC_PCS_D50_WHITE_POINT,
	labMix,
	labToLinearRgb,
	lchToLab,
	linearRgbToOklab,
	linearRgbToRgb1,
	oklabToLinearRgb,
	rgb1ToLinearRgb,
	rgb8ToRgb1,
	RGB_PROFILES,
	rgba8ToRgba1,
	xyzToLinearRgb,
	xyzTransform,
} from "@ac-kit/math-color";
import { angleWrapDeg } from "@ac-kit/math-geometry";
import { RAD_TO_DEG } from "@ac-kit/math-scalar";

import type {
	CssColor,
	CssColorFunction,
	CssColorSpace,
	CssComponent,
} from "./css-color.js";
import { UnresolvedColorError } from "./errors.js";
import { cssNamedColor } from "./named-colors.js";

/** A resolved colour: sRGB in `[0, 1]` with straight (unpremultiplied) alpha. */
export type ResolvedColor = {
	readonly r: number;
	readonly g: number;
	readonly b: number;
	readonly alpha: number;
};

export type ResolveOptions = {
	/**
	 * What `currentColor` stands for. Absent leaves it unresolvable, which is the
	 * honest answer outside a cascade.
	 */
	readonly currentColor?: ResolvedColor;
};

/** The XYZ spaces carry tristimulus values, so they name no RGB primaries. */
type CssRgbColorSpace = Exclude<CssColorSpace, `xyz${string}`>;

/** The profile each non-XYZ `color()` space names. sRGB is the output space. */
const SPACE_PROFILES = {
	srgb: RGB_PROFILES.sRGB,
	"srgb-linear": RGB_PROFILES.sRGB,
	"display-p3": RGB_PROFILES.DisplayP3,
	"a98-rgb": RGB_PROFILES.AdobeRGB,
	"prophoto-rgb": RGB_PROFILES.ProPhotoRGB,
	rec2020: RGB_PROFILES.Rec2020,
} as const satisfies Record<CssRgbColorSpace, RgbProfile>;

type Channels = Omit<ResolvedColor, "alpha">;

/**
 * Evaluates a parsed colour to sRGB.
 *
 * Separate from parsing because the two answer different questions: a linter
 * wants to know what was written, a renderer wants a value. Relative colour
 * syntax needs both — its origin is parsed, resolved, then read back as
 * channels.
 *
 * Out-of-gamut results are clamped rather than gamut-mapped; a caller that
 * cares should map with `@ac-kit/math-color` first.
 *
 * @throws {UnresolvedColorError} For `currentColor` with no substitute given,
 *   or a channel keyword the notation does not expose.
 */
export function resolveCssColor(
	color: CssColor,
	options?: ResolveOptions,
): ResolvedColor {
	switch (color.kind) {
		case "transparent":
			return { r: 0, g: 0, b: 0, alpha: 0 };

		case "currentColor": {
			const current = options?.currentColor;
			if (!current) {
				throw new UnresolvedColorError(
					"currentColor has no value outside a cascade; pass `currentColor` to resolve it",
				);
			}
			return current;
		}

		case "named": {
			const rgb8 = cssNamedColor(color.name);
			if (rgb8 === null) {
				throw new UnresolvedColorError(`unknown colour keyword ${color.name}`);
			}
			const rgb = rgb8ToRgb1(rgb8);
			return { r: rgb.r, g: rgb.g, b: rgb.b, alpha: 1 };
		}

		case "hex": {
			const rgba = rgba8ToRgba1(color);
			return { r: rgba.r, g: rgba.g, b: rgba.b, alpha: rgba.alpha! };
		}

		case "function":
			return resolveFunction_(color, options);

		case "color":
			return resolveSpace_(color, options);

		case "mix":
			return resolveMix_(color, options);
	}
}

/**
 * A component as a plain number, scaling a percentage against `reference`.
 *
 * `none` reads as zero: interpolation distinguishes it from zero, but a single
 * resolved colour has nowhere to keep the difference.
 */
function componentValue_(
	component: CssComponent | null,
	reference: number,
	fallback: number,
	origin: Readonly<Record<string, number>> | null,
): number {
	if (component === null) {
		return fallback;
	}

	switch (component.kind) {
		case "number":
			return component.value;
		case "percentage":
			return (component.value / 100) * reference;
		case "angle":
			return component.radians;
		case "none":
			return 0;
		case "channel": {
			const value = origin?.[component.name];
			if (value === undefined) {
				throw new UnresolvedColorError(
					`channel ${component.name} is not available here`,
				);
			}
			return value;
		}
	}
}

/**
 * A hue in degrees.
 *
 * A bare number in a hue slot is degrees per the spec, while an explicit angle
 * carries its own unit — the parser has already normalised those to radians,
 * and channel keywords come from {@link originChannels_} already in degrees.
 */
function hueDegrees_(
	component: CssComponent,
	origin: Readonly<Record<string, number>> | null,
): number {
	if (component.kind === "angle") {
		return component.radians * RAD_TO_DEG;
	}

	return componentValue_(component, 360, 0, origin);
}

/** The origin colour's channels, in the units the target notation uses. */
function originChannels_(
	origin: CssColor | null,
	options: ResolveOptions | undefined,
	notation: CssColorFunction | "color",
): Readonly<Record<string, number>> | null {
	if (origin === null) {
		return null;
	}

	const resolved = resolveCssColor(origin, options);
	const channels: Record<string, number> = { alpha: resolved.alpha };

	switch (notation) {
		case "rgb":
		case "color": {
			const scale = notation === "rgb" ? 255 : 1;
			channels["r"] = resolved.r * scale;
			channels["g"] = resolved.g * scale;
			channels["b"] = resolved.b * scale;
			break;
		}

		case "hsl":
		case "hwb": {
			const hsl = rgbToHsl_(resolved);
			channels["h"] = hsl.h;
			if (notation === "hsl") {
				channels["s"] = hsl.s * 100;
				channels["l"] = hsl.l * 100;
			} else {
				const max = Math.max(resolved.r, resolved.g, resolved.b);
				const min = Math.min(resolved.r, resolved.g, resolved.b);
				channels["w"] = min * 100;
				channels["b"] = (1 - max) * 100;
			}
			break;
		}

		case "oklab":
		case "oklch": {
			const oklab = srgbToOklab_(resolved);
			channels["l"] = oklab.L;
			if (notation === "oklab") {
				channels["a"] = oklab.a;
				channels["b"] = oklab.b;
			} else {
				channels["c"] = Math.hypot(oklab.a, oklab.b);
				channels["h"] = angleWrapDeg(Math.atan2(oklab.b, oklab.a) * RAD_TO_DEG);
			}
			break;
		}

		// CIE Lab channels of an origin would need the sRGB→Lab direction, which
		// no consumer has asked for; the keywords stay unavailable rather than
		// silently reporting OKLab's.
		case "lab":
		case "lch":
			break;
	}

	return channels;
}

/** SRGB as CSS HSL: hue in degrees, saturation and lightness in `[0, 1]`. */
function rgbToHsl_(color: ResolvedColor): { h: number; s: number; l: number } {
	const max = Math.max(color.r, color.g, color.b);
	const min = Math.min(color.r, color.g, color.b);
	const chroma = max - min;
	const l = (max + min) / 2;

	if (chroma === 0) {
		return { h: 0, s: 0, l };
	}

	const h =
		max === color.r
			? ((color.g - color.b) / chroma) % 6
			: max === color.g
				? (color.b - color.r) / chroma + 2
				: (color.r - color.g) / chroma + 4;

	return {
		h: angleWrapDeg(h * 60),
		s: chroma / (1 - Math.abs(2 * l - 1)),
		l,
	};
}

function resolveFunction_(
	color: Extract<CssColor, { kind: "function" }>,
	options?: ResolveOptions,
): ResolvedColor {
	const origin = originChannels_(color.origin, options, color.name);
	const [first, second, third] = color.components;
	const alpha = clamp01_(componentValue_(color.alpha, 1, 1, origin));

	switch (color.name) {
		case "rgb": {
			const channel = (component: CssComponent): number =>
				clamp01_(componentValue_(component, 255, 0, origin) / 255);
			return {
				r: channel(first),
				g: channel(second),
				b: channel(third),
				alpha,
			};
		}

		case "hsl":
			return {
				...hslToRgb_(
					hueDegrees_(first, origin),
					clamp01_(componentValue_(second, 100, 0, origin) / 100),
					clamp01_(componentValue_(third, 100, 0, origin) / 100),
				),
				alpha,
			};

		case "hwb":
			return {
				...hwbToRgb_(
					hueDegrees_(first, origin),
					clamp01_(componentValue_(second, 100, 0, origin) / 100),
					clamp01_(componentValue_(third, 100, 0, origin) / 100),
				),
				alpha,
			};

		// CSS quotes Lab percentages against L=100 and |a|,|b|=125, LCh chroma
		// against 150, and OKLab's against 1 and 0.4.
		case "lab":
			return {
				...labChannels_({
					L: componentValue_(first, 100, 0, origin),
					a: componentValue_(second, 125, 0, origin),
					b: componentValue_(third, 125, 0, origin),
				}),
				alpha,
			};

		case "lch":
			return {
				...labChannels_(
					lchToLab({
						L: componentValue_(first, 100, 0, origin),
						C: componentValue_(second, 150, 0, origin),
						h: hueDegrees_(third, origin),
					} as InSpace<LchCoords, "lch">),
				),
				alpha,
			};

		case "oklab":
			return {
				...oklabChannels_({
					L: clamp01_(componentValue_(first, 1, 0, origin)),
					a: componentValue_(second, 0.4, 0, origin),
					b: componentValue_(third, 0.4, 0, origin),
				} as Oklab),
				alpha,
			};

		case "oklch":
			return {
				...oklabChannels_(
					lchToLab({
						L: componentValue_(first, 1, 0, origin),
						C: componentValue_(second, 0.4, 0, origin),
						h: hueDegrees_(third, origin),
					} as Oklch),
				),
				alpha,
			};
	}
}

function resolveSpace_(
	color: Extract<CssColor, { kind: "color" }>,
	options: ResolveOptions | undefined,
): ResolvedColor {
	const origin = originChannels_(color.origin, options, "color");
	const alpha = clamp01_(componentValue_(color.alpha, 1, 1, origin));
	const [first, second, third] = color.components;
	const coords = {
		r: componentValue_(first, 1, 0, origin),
		g: componentValue_(second, 1, 0, origin),
		b: componentValue_(third, 1, 0, origin),
	};

	// The XYZ spaces name absolute tristimulus values, not primaries, so they
	// enter through the matrix rather than through a transfer function.
	if (color.space.startsWith("xyz")) {
		const tristimulus = { x: coords.r, y: coords.g, z: coords.b };
		// `xyz` and `xyz-d65` are already D65; only `xyz-d50` needs adapting.
		const d65 =
			color.space === "xyz-d50"
				? xyzTransform(
						tristimulus,
						ICC_PCS_D50_WHITE_POINT,
						CIE_D65_WHITE_POINT,
					)
				: tristimulus;

		return {
			...linearRgbToRgb1(
				xyzToLinearRgb(d65, RGB_PROFILES.sRGB),
				RGB_PROFILES.sRGB,
			),
			alpha,
		};
	}

	const profile = SPACE_PROFILES[color.space as CssRgbColorSpace];

	const linear =
		color.space === "srgb-linear"
			? (coords as SrgbLinear)
			: rgb1ToLinearRgb(coords, profile);

	// A different profile's primaries are a different colour in sRGB, so the
	// values go through XYZ rather than being reused channel for channel.
	if (color.space === "srgb" || color.space === "srgb-linear") {
		return { ...linearRgbToRgb1(linear, profile), alpha };
	} else {
		return {
			...oklabChannels_(linearRgbToOklab(linear, profile)),
			alpha,
		};
	}
}

/**
 * `color-mix()` in OKLab, whatever space was named.
 *
 * The spec interpolates in the named space; this approximates each of them with
 * OKLab, which agrees closely for the rectangular spaces and differs for the
 * polar ones by taking the shortest hue arc rather than the one the keyword
 * asked for.
 */
function resolveMix_(
	color: Extract<CssColor, { kind: "mix" }>,
	options: ResolveOptions | undefined,
): ResolvedColor {
	const first = resolveCssColor(color.first, options);
	const second = resolveCssColor(color.second, options);

	const firstWeight = color.firstWeight ?? 100 - (color.secondWeight ?? 50);
	const secondWeight = color.secondWeight ?? 100 - firstWeight;
	const total = firstWeight + secondWeight;
	if (total === 0) {
		throw new UnresolvedColorError("the two color-mix percentages sum to zero");
	}

	const t = secondWeight / total;
	const mixed = labMix(srgbToOklab_(first), srgbToOklab_(second), t);
	return {
		...oklabChannels_(mixed),
		alpha: first.alpha * (1 - t) + second.alpha * t,
	};
}

function srgbToOklab_(color: ResolvedColor): Oklab {
	return linearRgbToOklab(
		rgb1ToLinearRgb({ r: color.r, g: color.g, b: color.b }, RGB_PROFILES.sRGB),
		RGB_PROFILES.sRGB,
	);
}

function oklabChannels_(color: Oklab): Channels {
	return linearRgbToRgb1(
		oklabToLinearRgb(color, RGB_PROFILES.sRGB),
		RGB_PROFILES.sRGB,
	);
}

/** CSS Lab and LCh are D50-referenced, unlike OKLab's own white point. */
function labChannels_(color: LabCoords): Channels {
	return linearRgbToRgb1(
		labToLinearRgb(color, ICC_PCS_D50_WHITE_POINT, RGB_PROFILES.sRGB),
		RGB_PROFILES.sRGB,
	);
}

function clamp01_(value: number): number {
	return clamp(value, 0, 1);
}

/** CSS HSL, with hue in degrees and both others already in `[0, 1]`. */
function hslToRgb_(
	hueDegrees: number,
	saturation: number,
	lightness: number,
): Channels {
	const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
	return fromChroma_(hueDegrees, chroma, lightness - chroma / 2);
}

/** CSS HWB: a pure hue washed out by whiteness and darkened by blackness. */
function hwbToRgb_(
	hueDegrees: number,
	whiteness: number,
	blackness: number,
): Channels {
	if (whiteness + blackness >= 1) {
		const grey = whiteness / (whiteness + blackness);
		return { r: grey, g: grey, b: grey };
	}

	const pure = fromChroma_(hueDegrees, 1, 0);
	const span = 1 - whiteness - blackness;
	return {
		r: pure.r * span + whiteness,
		g: pure.g * span + whiteness,
		b: pure.b * span + whiteness,
	};
}

function fromChroma_(
	hueDegrees: number,
	chroma: number,
	offset: number,
): Channels {
	const sextant = mod(hueDegrees / 60, 6);
	const secondary = chroma * (1 - Math.abs((sextant % 2) - 1));
	const table: readonly (readonly [number, number, number])[] = [
		[chroma, secondary, 0],
		[secondary, chroma, 0],
		[0, chroma, secondary],
		[0, secondary, chroma],
		[secondary, 0, chroma],
		[chroma, 0, secondary],
	];
	const [r, g, b] = table[Math.floor(sextant)]!;
	return { r: r + offset, g: g + offset, b: b + offset };
}
