import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { type Rgb8, rgb8ToOklab } from "@ac-kit/math-color";
import { spawnProcess } from "@ac-kit/node";

import { colorNativeGroup } from "./__fixtures__/native-group.js";
import {
	assertChecksumClose,
	labChecksum,
	LARGE_IMAGE,
	LINEAR_FROM_BYTE,
	OKLAB_FROM_LINEAR_RGB,
	rgb8Objects,
	rgbaBytes,
} from "./__fixtures__/pixels.js";

/**
 * Numpy as the outside reference for a whole-image colour conversion — the
 * point at which someone asks whether this work belongs in Python instead.
 *
 * Separate from `rgb8-to-oklab.bench.ts` and much larger, for the reason
 * `math-stats` splits its own cross-language group out: a subprocess pays about
 * 55 ms to start Python and import numpy, so at 512×512 the comparison would be
 * of process start-up rather than of conversion. Only the two JavaScript ends
 * of the range are carried across — the package as it stands, and the fastest
 * fused kernel — because the point of this table is the language boundary, not
 * the layout.
 */

const K = OKLAB_FROM_LINEAR_RGB;

const nativeGroup = await colorNativeGroup();

durationCondition(
	`sRGB → OKLab — ${LARGE_IMAGE.toLocaleString("en-US")} pixels (2048×2048)`,
	{
		sampling: {
			warmup: 2,
			minRuns: 5,
			maxRuns: 12,
			minTimeMs: 500,
			maxTimeMs: 8_000,
		},
		spawnBaselines: nativeGroup?.baselines,
	},
	() => {
		const bytes = rgbaBytes(LARGE_IMAGE);
		const lightness = new Float64Array(LARGE_IMAGE);
		const aAxis = new Float64Array(LARGE_IMAGE);
		const bAxis = new Float64Array(LARGE_IMAGE);

		function convert(): void {
			for (let index = 0; index < LARGE_IMAGE; index++) {
				const at = index * 4;
				const r = LINEAR_FROM_BYTE[bytes[at]!]!;
				const g = LINEAR_FROM_BYTE[bytes[at + 1]!]!;
				const b = LINEAR_FROM_BYTE[bytes[at + 2]!]!;
				const l = Math.cbrt(K.lR * r + K.lG * g + K.lB * b);
				const m = Math.cbrt(K.mR * r + K.mG * g + K.mB * b);
				const s = Math.cbrt(K.sR * r + K.sG * g + K.sB * b);
				lightness[index] = K.labLl * l + K.labLm * m + K.labLs * s;
				aAxis[index] = K.labAl * l + K.labAm * m + K.labAs * s;
				bAxis[index] = K.labBl * l + K.labBm * m + K.labBs * s;
			}
		}

		// The fused kernel is the reference: it is what numpy also computes, and
		// running the package over four million pixels to derive it would spend
		// most of the condition's setup budget. Its agreement with the package is
		// established at 512×512 in the storage suite.
		convert();
		const wanted = labChecksum(
			LARGE_IMAGE,
			(index) => lightness[index]!,
			(index) => aAxis[index]!,
			(index) => bAxis[index]!,
		);

		durationCase(
			"ImageData RGBA → planes, fused kernel + LUT",
			{ tags: { input: "u8 rgba", language: "TypeScript", kernel: "fused" } },
			() => {
				convert();
				assertChecksumClose(
					labChecksum(
						LARGE_IMAGE,
						(index) => lightness[index]!,
						(index) => aAxis[index]!,
						(index) => bAxis[index]!,
					),
					wanted,
					LARGE_IMAGE,
				);
			},
		);

		const objects = rgb8Objects(LARGE_IMAGE) as Rgb8[];
		durationCase(
			"Rgb8[] → Oklab[] (math-color today)",
			{ tags: { input: "object[]", language: "TypeScript" } },
			() => {
				const out = Array.from({ length: LARGE_IMAGE }, () => ({
					L: 0,
					a: 0,
					b: 0,
				}));
				for (let index = 0; index < LARGE_IMAGE; index++) {
					const lab = rgb8ToOklab(objects[index]!);
					out[index] = { L: lab.L, a: lab.a, b: lab.b };
				}
				assertChecksumClose(
					labChecksum(
						LARGE_IMAGE,
						(index) => out[index]!.L,
						(index) => out[index]!.a,
						(index) => out[index]!.b,
					),
					wanted,
					LARGE_IMAGE,
				);
			},
		);

		for (const program of nativeGroup?.programs ?? []) {
			durationCase(
				`${program.language} + numpy (vectorised)`,
				{
					tags: { input: "u8 rgb", language: program.language, kind: "native" },
					subtractSpawnBaseline: true,
				},
				async () => {
					const { stdout } = await spawnProcess(program.command, [
						...program.baseArgs,
						"oklab",
						String(LARGE_IMAGE),
						"1",
					]);
					assertChecksumClose(Number.parseFloat(stdout), wanted, LARGE_IMAGE);
				},
			);
		}
	},
);
