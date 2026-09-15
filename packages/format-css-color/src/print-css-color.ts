import { round } from "@ac-kit/core";
import { Rgba8 } from "@ac-kit/math-color";
import { RAD_TO_DEG } from "@ac-kit/math-scalar";

import type { CssColor, CssComponent } from "./css-color.js";
import type { ResolvedColor } from "./resolve-css-color.js";

export type PrintOptions = {
	/**
	 * Whether to emit the legacy comma form for `rgb()`/`hsl()` even where the
	 * tree records the modern one. Default: whatever was parsed.
	 */
	readonly legacy?: boolean;
};

/**
 * Serialises a colour back to CSS.
 *
 * Round-trips what was parsed rather than normalising: a printer that rewrote
 * `#fff` as `rgb(255 255 255)` would be a formatter, and a formatter that
 * cannot be turned off is unusable in a linter.
 */
export function printCssColor(color: CssColor, options?: PrintOptions): string {
	switch (color.kind) {
		case "transparent":
			return "transparent";
		case "currentColor":
			return "currentColor";
		case "named":
			return color.name;
		case "hex":
			return printHex_(color);
		case "function":
			return printFunction_(color, options);
		case "color":
			return printSpace_(color);
		case "mix":
			return printMix_(color, options);
	}
}

function printHex_(color: Extract<CssColor, { kind: "hex" }>): string {
	const pair = (value: number) => value.toString(16).padStart(2, "0");
	const short = (value: number) => pair(value)[0]!;
	const digit = color.digits === 3 || color.digits === 4 ? short : pair;

	const channels = [color.r8, color.g8, color.b8].map(digit).join("");
	const alpha = color.digits === 4 || color.digits === 8 ? digit(color.a8) : "";
	return `#${channels}${alpha}`;
}

function printComponent_(component: CssComponent): string {
	switch (component.kind) {
		case "number":
			return String(component.value);
		case "percentage":
			return `${component.value}%`;
		case "angle":
			return `${round(component.radians * RAD_TO_DEG, { fractionDigits: 3 })}deg`;
		case "none":
			return "none";
		case "channel":
			return component.name;
	}
}

function printFunction_(
	color: Extract<CssColor, { kind: "function" }>,
	options: PrintOptions | undefined,
): string {
	const legacy = options?.legacy ?? color.legacy;
	const parts = color.components.map(printComponent_);
	const origin =
		color.origin === null ? "" : `from ${printCssColor(color.origin)} `;

	if (legacy) {
		const alpha =
			color.alpha === null ? "" : `, ${printComponent_(color.alpha)}`;
		const name = color.alpha === null ? color.name : `${color.name}a`;
		return `${name}(${parts.join(", ")}${alpha})`;
	}

	const alpha =
		color.alpha === null ? "" : ` / ${printComponent_(color.alpha)}`;
	return `${color.name}(${origin}${parts.join(" ")}${alpha})`;
}

function printSpace_(color: Extract<CssColor, { kind: "color" }>): string {
	const origin =
		color.origin === null ? "" : `from ${printCssColor(color.origin)} `;
	const parts = color.components.map(printComponent_).join(" ");
	const alpha =
		color.alpha === null ? "" : ` / ${printComponent_(color.alpha)}`;
	return `color(${origin}${color.space} ${parts}${alpha})`;
}

function printMix_(
	color: Extract<CssColor, { kind: "mix" }>,
	options: PrintOptions | undefined,
): string {
	const weight = (value: number | null) => (value === null ? "" : ` ${value}%`);
	return `color-mix(in ${color.space}, ${printCssColor(color.first, options)}${weight(
		color.firstWeight,
	)}, ${printCssColor(color.second, options)}${weight(color.secondWeight)})`;
}

/** How many digits a hex serialisation uses. */
export type HexDigits = 3 | 4 | 6 | 8;

/**
 * A resolved colour as a hex literal.
 *
 * The 3- and 4-digit forms are only exact when every channel's two digits
 * match; otherwise they round to the nearest such value, which is a visible
 * change. Ask for them only when a short literal matters more than fidelity.
 *
 * @param digits Default 6, or 8 when the colour is not fully opaque.
 */
export function toHex(color: ResolvedColor, digits?: HexDigits): string {
	const rgba8: Rgba8 = {
		r8: Math.round(color.r * 255),
		g8: Math.round(color.g * 255),
		b8: Math.round(color.b * 255),
		a8: Math.round(color.alpha * 255),
	};
	const width = digits ?? (rgba8.a8 === 255 ? 6 : 8);

	return printHex_({
		kind: "hex",
		...rgba8,
		digits: width,
	});
}
