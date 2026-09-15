import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { resourceCase, resourceCondition } from "@ac-bench/measure-resource";
import {
	createNearestColorFinder,
	type Rgb8,
	rgb8ToOklab,
} from "@ac-kit/math-color";

import {
	channelAt,
	COLOR_SAMPLING,
	LINEAR_FROM_BYTE,
	OKLAB_FROM_LINEAR_RGB,
} from "./__fixtures__/pixels.js";

/**
 * One operation — find the nearest entry of a fixed palette to a query colour —
 * which is what `format-ansi`'s `nearestAnsi256` does once per cell when a
 * terminal cannot render 24-bit colour. That function is package-private, so
 * what is measured here is the public composition it is built from:
 * `createNearestColorFinder` over the same 240-entry xterm palette, queried
 * through `rgb8ToOklab`.
 *
 * The palette is fixed and small; the query is per cell. So the question is not
 * how to store the palette but how much of the per-query work can be moved into
 * the registration that already exists.
 */

const CUBE_LEVELS = [0, 95, 135, 175, 215, 255];
const QUERIES = 20_000;

type PaletteEntry = { index: number; color: Rgb8 };

/** The identical 240 entries `format-ansi` builds: 6×6×6 cube then 24 greys. */
function xtermPalette(): PaletteEntry[] {
	const entries: PaletteEntry[] = [];
	for (let r = 0; r < 6; r++) {
		for (let g = 0; g < 6; g++) {
			for (let b = 0; b < 6; b++) {
				entries.push({
					index: 16 + 36 * r + 6 * g + b,
					color: {
						r8: CUBE_LEVELS[r]!,
						g8: CUBE_LEVELS[g]!,
						b8: CUBE_LEVELS[b]!,
					},
				});
			}
		}
	}
	for (let step = 0; step < 24; step++) {
		const level = 8 + 10 * step;
		entries.push({
			index: 232 + step,
			color: { r8: level, g8: level, b8: level },
		});
	}

	return entries;
}

const K = OKLAB_FROM_LINEAR_RGB;

/**
 * The fused conversion from `rgb8-to-oklab.bench.ts`, one colour at a time,
 * writing into a caller-owned slot. Returning a tuple instead would allocate
 * once per query and make this contender lose to the object-based one it is
 * supposed to beat.
 */
function toOklabInto(
	out: Float64Array,
	r8: number,
	g8: number,
	b8: number,
): void {
	const r = LINEAR_FROM_BYTE[r8]!;
	const g = LINEAR_FROM_BYTE[g8]!;
	const b = LINEAR_FROM_BYTE[b8]!;
	const l = Math.cbrt(K.lR * r + K.lG * g + K.lB * b);
	const m = Math.cbrt(K.mR * r + K.mG * g + K.mB * b);
	const s = Math.cbrt(K.sR * r + K.sG * g + K.sB * b);
	out[0] = K.labLl * l + K.labLm * m + K.labLs * s;
	out[1] = K.labAl * l + K.labAm * m + K.labAs * s;
	out[2] = K.labBl * l + K.labBm * m + K.labBs * s;
}

const palette = xtermPalette();
const queries = Array.from({ length: QUERIES }, (_unused, index) => ({
	r8: channelAt(index, 7),
	g8: channelAt(index, 13),
	b8: channelAt(index, 29),
}));

/**
 * The palette is coarse enough that the two conversion routes never disagree
 * about which entry is nearest, so every contender must return the identical
 * index sequence and the check can be exact.
 */
const wanted = (() => {
	const finder = createNearestColorFinder(palette, (entry) =>
		rgb8ToOklab(entry.color),
	);
	let total = 0;
	for (let index = 0; index < QUERIES; index++) {
		total += finder(rgb8ToOklab(queries[index]!)).index * (index % 7) + 1;
	}

	return total;
})();

function registerContenders_(
	register: (
		name: string,
		tags: Record<string, string>,
		run: () => void,
	) => void,
): void {
	{
		const finder = createNearestColorFinder(palette, (entry) =>
			rgb8ToOklab(entry.color),
		);
		register(
			"createNearestColorFinder over objects (today)",
			{ palette: "object[]", query: "package" },
			() => {
				let total = 0;
				for (let index = 0; index < QUERIES; index++) {
					total += finder(rgb8ToOklab(queries[index]!)).index * (index % 7) + 1;
				}
				assert.strictEqual(total, wanted);
			},
		);
	}

	{
		// Palette flattened to one contiguous buffer, converted once at
		// registration exactly as the finder already does — only the storage of
		// the converted table changes.
		const table = new Float64Array(palette.length * 3);
		const indices = new Uint8Array(palette.length);
		for (let entry = 0; entry < palette.length; entry++) {
			const lab = rgb8ToOklab(palette[entry]!.color);
			table[entry * 3] = lab.L;
			table[entry * 3 + 1] = lab.a;
			table[entry * 3 + 2] = lab.b;
			indices[entry] = palette[entry]!.index;
		}
		register(
			"Float64Array palette table, package conversion",
			{ palette: "f64 table", query: "package" },
			() => {
				let total = 0;
				for (let index = 0; index < QUERIES; index++) {
					const lab = rgb8ToOklab(queries[index]!);
					let best = 0;
					let bestDistance = Infinity;
					for (let entry = 0; entry < indices.length; entry++) {
						const at = entry * 3;
						const dL = lab.L - table[at]!;
						const dA = lab.a - table[at + 1]!;
						const dB = lab.b - table[at + 2]!;
						const distance = dL * dL + dA * dA + dB * dB;
						if (distance < bestDistance) {
							bestDistance = distance;
							best = entry;
						}
					}
					total += indices[best]! * (index % 7) + 1;
				}
				assert.strictEqual(total, wanted);
			},
		);
	}

	{
		const table = new Float64Array(palette.length * 3);
		const indices = new Uint8Array(palette.length);
		for (let entry = 0; entry < palette.length; entry++) {
			const lab = rgb8ToOklab(palette[entry]!.color);
			table[entry * 3] = lab.L;
			table[entry * 3 + 1] = lab.a;
			table[entry * 3 + 2] = lab.b;
			indices[entry] = palette[entry]!.index;
		}
		const scratch = new Float64Array(3);
		register(
			"Float64Array palette table, fused query conversion",
			{ palette: "f64 table", query: "fused" },
			() => {
				let total = 0;
				for (let index = 0; index < QUERIES; index++) {
					const query = queries[index]!;
					toOklabInto(scratch, query.r8, query.g8, query.b8);
					const qL = scratch[0]!;
					const qA = scratch[1]!;
					const qB = scratch[2]!;
					let best = 0;
					let bestDistance = Infinity;
					for (let entry = 0; entry < indices.length; entry++) {
						const at = entry * 3;
						const dL = qL - table[at]!;
						const dA = qA - table[at + 1]!;
						const dB = qB - table[at + 2]!;
						const distance = dL * dL + dA * dA + dB * dB;
						if (distance < bestDistance) {
							bestDistance = distance;
							best = entry;
						}
					}
					total += indices[best]! * (index % 7) + 1;
				}
				assert.strictEqual(total, wanted);
			},
		);
	}

	{
		// The whole query is a pure function of a 24-bit input, so the answer for
		// every colour a caller can ask about fits in one 16 MiB table. Built
		// lazily here over the queries actually seen, which is what a real cache
		// would do.
		const cache = new Int16Array(1 << 24).fill(-1);
		const table = new Float64Array(palette.length * 3);
		const indices = new Uint8Array(palette.length);
		for (let entry = 0; entry < palette.length; entry++) {
			const lab = rgb8ToOklab(palette[entry]!.color);
			table[entry * 3] = lab.L;
			table[entry * 3 + 1] = lab.a;
			table[entry * 3 + 2] = lab.b;
			indices[entry] = palette[entry]!.index;
		}
		const scratch = new Float64Array(3);
		register(
			"memoised on the 24-bit key, fused on miss",
			{ palette: "f64 table", query: "memoised" },
			() => {
				let total = 0;
				for (let index = 0; index < QUERIES; index++) {
					const query = queries[index]!;
					const key = (query.r8 << 16) | (query.g8 << 8) | query.b8;
					let answer = cache[key]!;
					if (answer < 0) {
						toOklabInto(scratch, query.r8, query.g8, query.b8);
						const qL = scratch[0]!;
						const qA = scratch[1]!;
						const qB = scratch[2]!;
						let best = 0;
						let bestDistance = Infinity;
						for (let entry = 0; entry < indices.length; entry++) {
							const at = entry * 3;
							const dL = qL - table[at]!;
							const dA = qA - table[at + 1]!;
							const dB = qB - table[at + 2]!;
							const distance = dL * dL + dA * dA + dB * dB;
							if (distance < bestDistance) {
								bestDistance = distance;
								best = entry;
							}
						}
						answer = indices[best]!;
						cache[key] = answer;
					}
					total += answer * (index % 7) + 1;
				}
				assert.strictEqual(total, wanted);
			},
		);
	}
}

durationCondition(
	`Nearest palette entry — ${QUERIES.toLocaleString("en-US")} queries over 240 colours`,
	// The memoised contender returns in tens of microseconds, and a case body
	// that short floods the sampler's IPC channel and silently drops rows.
	{ sampling: { ...COLOR_SAMPLING, maxRuns: 40, minTimeMs: 300 } },
	() => {
		registerContenders_((name, tags, run) => durationCase(name, { tags }, run));
	},
);

resourceCondition(
	`Nearest palette entry — ${QUERIES.toLocaleString("en-US")} queries — allocation`,
	() => {
		registerContenders_((name, tags, run) => resourceCase(name, { tags }, run));
	},
);
