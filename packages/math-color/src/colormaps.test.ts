import { expect, suite, test } from "vitest";

import {
	CATEGORICAL_PALETTE_NAMES,
	categoricalPalette,
	DIVERGING_RAMP_NAMES,
	namedColorRamp,
	SEQUENTIAL_RAMP_NAMES,
} from "./colormaps.js";
import { labDistance } from "./models/lab.js";

const RAMP_NAMES = [...SEQUENTIAL_RAMP_NAMES, ...DIVERGING_RAMP_NAMES];

suite("namedColorRamp", () => {
	test("returns the same instance for the same name", () => {
		expect(namedColorRamp("viridis")).toBe(namedColorRamp("viridis"));
	});

	test("every scheme spans a visible range end to end", () => {
		for (const name of RAMP_NAMES) {
			const ramp = namedColorRamp(name);
			// A just-noticeable difference in OKLab is around 0.02.
			expect(labDistance(ramp(0), ramp(1)), name).toBeGreaterThan(0.1);
		}
	});

	test("every scheme stays inside the OKLab lightness range", () => {
		for (const name of RAMP_NAMES) {
			const ramp = namedColorRamp(name);
			for (const t of [0, 0.25, 0.5, 0.75, 1]) {
				expect(ramp(t).L, `${name} @ ${t}`).toBeGreaterThanOrEqual(0);
				expect(ramp(t).L, `${name} @ ${t}`).toBeLessThanOrEqual(1);
			}
		}
	});

	// A perceptually-uniform scheme reads as "more" because its lightness only
	// ever moves one way. `turbo`, `warm` and `cool` are rainbow-family: they are
	// sequential by use but deliberately not monotonic, which is exactly why
	// they are the wrong choice for encoding a magnitude.
	test("every perceptually-uniform scheme moves in one lightness direction", () => {
		const uniform = [
			"viridis",
			"inferno",
			"magma",
			"plasma",
			"cividis",
			"greys",
			"blues",
			"greens",
			"oranges",
			"reds",
			"purples",
		] as const;

		for (const name of uniform) {
			const samples = [0, 0.2, 0.4, 0.6, 0.8, 1].map(
				(t) => namedColorRamp(name)(t).L,
			);
			const ascending = [...samples].sort((a, b) => a - b);
			expect(
				samples.toString() === ascending.toString() ||
					samples.toString() === [...ascending].reverse().toString(),
				name,
			).toBe(true);
		}
	});
});

suite("categoricalPalette", () => {
	test("returns the same instance for the same name", () => {
		expect(categoricalPalette("tableau10")).toBe(
			categoricalPalette("tableau10"),
		);
	});

	// A palette exists to be told apart; two members within a
	// just-noticeable-difference of each other defeat the point.
	test("every palette's members are perceptually distinct", () => {
		for (const name of CATEGORICAL_PALETTE_NAMES) {
			const colors = categoricalPalette(name);
			for (let i = 0; i < colors.length; i++) {
				for (let j = i + 1; j < colors.length; j++) {
					expect(
						labDistance(colors[i]!, colors[j]!),
						`${name} ${i}/${j}`,
					).toBeGreaterThan(0.02);
				}
			}
		}
	});

	test("every palette offers at least eight members", () => {
		for (const name of CATEGORICAL_PALETTE_NAMES) {
			expect(categoricalPalette(name).length, name).toBeGreaterThanOrEqual(8);
		}
	});
});
