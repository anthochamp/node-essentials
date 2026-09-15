import { expect, suite, test } from "vitest";

import { CssColorSyntaxError } from "./errors.js";
import { parseCssColor, tryParseCssColor } from "./parse-css-color.js";
import { printCssColor, toHex } from "./print-css-color.js";
import { resolveCssColor } from "./resolve-css-color.js";

/** What a colour resolves to as a hex literal, which reads better than floats. */
function hex_(source: string): string {
	return toHex(resolveCssColor(parseCssColor(source)));
}

suite("parseCssColor", () => {
	test("reads every hex width", () => {
		expect(parseCssColor("#f00")).toMatchObject({ r8: 255, g8: 0, b8: 0 });
		expect(parseCssColor("#ff0000")).toMatchObject({ r8: 255, b8: 0 });
		expect(parseCssColor("#ff000080")).toMatchObject({ a8: 0x80 });
		expect(parseCssColor("#f008")).toMatchObject({ a8: 0x88 });
	});

	test("keeps the authored width so printing round-trips", () => {
		for (const source of ["#f00", "#f008", "#ff0000", "#ff000080"]) {
			expect(printCssColor(parseCssColor(source))).toBe(source);
		}
	});

	test("reads the legacy comma form and the modern space form alike", () => {
		expect(hex_("rgb(255, 0, 0)")).toBe("#ff0000");
		expect(hex_("rgb(255 0 0)")).toBe("#ff0000");
		expect(hex_("rgba(255, 0, 0, 0.5)")).toBe("#ff000080");
		expect(hex_("rgb(255 0 0 / 50%)")).toBe("#ff000080");
	});

	test("folds the legacy rgba and hsla spellings onto their function", () => {
		expect(parseCssColor("HSLA(0, 100%, 50%, 1)")).toMatchObject({
			name: "hsl",
			legacy: true,
		});
		expect(printCssColor(parseCssColor("hsla(0, 100%, 50%, 0.5)"))).toBe(
			"hsla(0, 100%, 50%, 0.5)",
		);
	});

	test("reads a hue in every angle unit the spec allows", () => {
		for (const hue of ["120deg", "133.333grad", "2.0944rad", "0.3333turn"]) {
			expect(hex_(`hsl(${hue} 100% 50%)`)).toBe("#00ff00");
		}
	});

	test("treats a bare hue number as degrees", () => {
		expect(hex_("hsl(120 100% 50%)")).toBe("#00ff00");
	});

	test("reads `none` as a component", () => {
		expect(parseCssColor("rgb(none 0 0)")).toMatchObject({
			components: [{ kind: "none" }, { kind: "number" }, { kind: "number" }],
		});
	});

	test("rejects trailing text rather than parsing a prefix", () => {
		expect(() => parseCssColor("#f00 and more")).toThrow(CssColorSyntaxError);
	});

	test("reports the offset it gave up at", () => {
		try {
			parseCssColor("rgb(255, 0, zzz)");
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(CssColorSyntaxError);
			expect((error as CssColorSyntaxError).offset).toBeGreaterThan(10);
		}
	});

	test("reports failure without throwing when asked", () => {
		expect(tryParseCssColor("not-a-color")).toBeNull();
		expect(tryParseCssColor("#fff")).not.toBeNull();
	});
});

suite("resolveCssColor", () => {
	test("resolves a named colour through the registry", () => {
		expect(hex_("rebeccapurple")).toBe("#663399");
		expect(hex_("tomato")).toBe("#ff6347");
	});

	test("follows a spelling alias to its canonical entry", () => {
		expect(hex_("grey")).toBe(hex_("gray"));
		expect(hex_("aqua")).toBe(hex_("cyan"));
	});

	test("resolves transparent to a fully clear black", () => {
		expect(resolveCssColor(parseCssColor("transparent"))).toEqual({
			r: 0,
			g: 0,
			b: 0,
			alpha: 0,
		});
	});

	test("refuses currentColor with nothing to stand in for it", () => {
		expect(() => resolveCssColor(parseCssColor("currentColor"))).toThrow(
			/currentColor/,
		);
	});

	test("uses the substitute given for currentColor", () => {
		const current = { r: 1, g: 0, b: 0, alpha: 1 };
		expect(
			resolveCssColor(parseCssColor("currentColor"), { currentColor: current }),
		).toEqual(current);
	});

	test("resolves hwb, where whiteness and blackness wash out the hue", () => {
		expect(hex_("hwb(0 0% 0%)")).toBe("#ff0000");
		expect(hex_("hwb(0 100% 0%)")).toBe("#ffffff");
		expect(hex_("hwb(0 0% 100%)")).toBe("#000000");
	});

	test("resolves the OKLab family", () => {
		expect(hex_("oklab(0 0 0)")).toBe("#000000");
		expect(hex_("oklch(0 0 0)")).toBe("#000000");
		expect(hex_("oklab(1 0 0)")).toBe("#ffffff");
	});

	test("resolves the CIE Lab family against D50", () => {
		expect(hex_("lab(0 0 0)")).toBe("#000000");
		expect(hex_("lab(100 0 0)")).toBe("#ffffff");
		expect(hex_("lch(0 0 0)")).toBe("#000000");
	});

	test("resolves color(srgb …) as plain channels", () => {
		expect(hex_("color(srgb 1 0 0)")).toBe("#ff0000");
		expect(hex_("color(srgb 0 0 0 / 0.5)")).toBe("#00000080");
	});

	// A wider gamut's primaries are a different colour in sRGB, so the channels
	// must not simply carry across. Uses a mid-tone: a P3 primary lands outside
	// sRGB and clamps back onto the same corner, which would hide the bug.
	test("converts a wide-gamut color() rather than reusing its channels", () => {
		expect(hex_("color(display-p3 0.5 0.2 0.2)")).not.toBe(
			hex_("color(srgb 0.5 0.2 0.2)"),
		);
	});

	test("treats color(xyz …) as D65, like color(xyz-d65 …)", () => {
		expect(hex_("color(xyz 0.2 0.15 0.1)")).toBe(
			hex_("color(xyz-d65 0.2 0.15 0.1)"),
		);
	});

	// Same tristimulus numbers under a different illuminant are a different
	// colour, so xyz-d50 has to be chromatically adapted before conversion.
	test("adapts color(xyz-d50 …) to D65 instead of reading it as D65", () => {
		expect(hex_("color(xyz-d50 0.2 0.15 0.1)")).not.toBe(
			hex_("color(xyz-d65 0.2 0.15 0.1)"),
		);
	});

	// D50 white is the illuminant itself, so it must land on sRGB white.
	test("resolves the D50 white point to white", () => {
		expect(hex_("color(xyz-d50 0.9642 1 0.8249)")).toBe("#ffffff");
	});

	test("mixes two colours, defaulting to half each", () => {
		expect(hex_("color-mix(in oklab, black, white)")).toBe(
			hex_("color-mix(in oklab, black 50%, white 50%)"),
		);
	});

	test("honours an explicit mix weight", () => {
		expect(hex_("color-mix(in oklab, black 100%, white 0%)")).toBe("#000000");
		expect(hex_("color-mix(in oklab, black 0%, white 100%)")).toBe("#ffffff");
	});

	test("reads a channel of the origin in relative colour syntax", () => {
		expect(hex_("rgb(from #ff8000 r g b)")).toBe("#ff8000");
		expect(hex_("rgb(from #ff8000 0 g b)")).toBe("#008000");
	});

	test("rejects a channel keyword the notation does not expose", () => {
		expect(() => resolveCssColor(parseCssColor("rgb(from red h g b)"))).toThrow(
			CssColorSyntaxError,
		);
	});
});

suite("toHex", () => {
	test("widens to eight digits when the colour is not opaque", () => {
		expect(toHex({ r: 1, g: 0, b: 0, alpha: 1 })).toBe("#ff0000");
		expect(toHex({ r: 1, g: 0, b: 0, alpha: 0.5 })).toBe("#ff000080");
	});

	test("emits the short form on request", () => {
		expect(toHex({ r: 1, g: 0, b: 0, alpha: 1 }, 3)).toBe("#f00");
		expect(toHex({ r: 1, g: 0, b: 0, alpha: 1 }, 4)).toBe("#f00f");
	});
});
