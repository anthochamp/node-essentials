import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { resourceCase, resourceCondition } from "@ac-bench/measure-resource";
import { type Rgb8, rgb8ToOklab } from "@ac-kit/math-color";

import {
	assertChecksumClose,
	COLOR_SAMPLING,
	labChecksum,
	LINEAR_FROM_BYTE,
	OKLAB_FROM_LINEAR_RGB,
	packedRgb,
	rgb8Objects,
	rgbaBytes,
	SMALL_IMAGE,
	srgbToLinear,
} from "./__fixtures__/pixels.js";

/**
 * One operation — 8-bit sRGB to OKLab over a whole image — across the input
 * shapes a caller actually holds and the output shapes `math-color` could
 * produce. Today the package offers exactly one: an object in, an object out,
 * with roughly six allocations per pixel in between.
 *
 * The fused contenders use Ottosson's published linear-sRGB→LMS→OKLab
 * constants, which reach the same colour space by a shorter route than the
 * package's XYZ-mediated chain. Every contender is checked against the
 * package's own output, so a fused kernel that has drifted fails rather than
 * wins; the bound is per pixel because both a cube root and a gamma curve are
 * involved, and the two routes round D65 differently.
 *
 * Numpy is not here. At 512×512 a subprocess spends more time starting than
 * converting — it lives in `rgb8-to-oklab-cross-language.bench.ts`.
 */

const K = OKLAB_FROM_LINEAR_RGB;

function registerContenders_(
	count: number,
	register: (
		name: string,
		tags: Record<string, string>,
		run: () => void,
	) => void,
): number {
	const objects = rgb8Objects(count) as Rgb8[];

	let wanted = 0;
	{
		let total = 0;
		for (let index = 0; index < count; index++) {
			const lab = rgb8ToOklab(objects[index]!);
			total += lab.L + 3 * lab.a + 7 * lab.b;
		}
		wanted = total;
	}

	register(
		"Rgb8[] → Oklab[] (math-color today)",
		{ input: "object[]", output: "object[]" },
		() => {
			const out = Array.from({ length: count }, () => ({ L: 0, a: 0, b: 0 }));
			for (let index = 0; index < count; index++) {
				const lab = rgb8ToOklab(objects[index]!);
				out[index] = { L: lab.L, a: lab.a, b: lab.b };
			}
			assertChecksumClose(
				labChecksum(
					count,
					(index) => out[index]!.L,
					(index) => out[index]!.a,
					(index) => out[index]!.b,
				),
				wanted,
				count,
			);
		},
	);

	{
		const bytes = rgbaBytes(count);
		register(
			"ImageData RGBA → Oklab[], fresh Rgb8 per pixel",
			{ input: "u8 rgba", output: "object[]" },
			() => {
				const out = Array.from({ length: count }, () => ({ L: 0, a: 0, b: 0 }));
				for (let index = 0; index < count; index++) {
					const at = index * 4;
					const lab = rgb8ToOklab({
						r8: bytes[at]!,
						g8: bytes[at + 1]!,
						b8: bytes[at + 2]!,
					});
					out[index] = { L: lab.L, a: lab.a, b: lab.b };
				}
				assertChecksumClose(
					labChecksum(
						count,
						(index) => out[index]!.L,
						(index) => out[index]!.a,
						(index) => out[index]!.b,
					),
					wanted,
					count,
				);
			},
		);
	}

	{
		const bytes = rgbaBytes(count);
		const scratch: Rgb8 = { r8: 0, g8: 0, b8: 0 };
		const lightness = new Float64Array(count);
		const aAxis = new Float64Array(count);
		const bAxis = new Float64Array(count);
		register(
			"ImageData RGBA → planes, one reused Rgb8",
			{ input: "u8 rgba", output: "f64 planes" },
			() => {
				for (let index = 0; index < count; index++) {
					const at = index * 4;
					scratch.r8 = bytes[at]!;
					scratch.g8 = bytes[at + 1]!;
					scratch.b8 = bytes[at + 2]!;
					const lab = rgb8ToOklab(scratch);
					lightness[index] = lab.L;
					aAxis[index] = lab.a;
					bAxis[index] = lab.b;
				}
				assertChecksumClose(
					labChecksum(
						count,
						(index) => lightness[index]!,
						(index) => aAxis[index]!,
						(index) => bAxis[index]!,
					),
					wanted,
					count,
				);
			},
		);
	}

	{
		const bytes = rgbaBytes(count);
		const lightness = new Float64Array(count);
		const aAxis = new Float64Array(count);
		const bAxis = new Float64Array(count);
		register(
			"ImageData RGBA → planes, fused kernel + LUT",
			{ input: "u8 rgba", output: "f64 planes", kernel: "fused" },
			() => {
				for (let index = 0; index < count; index++) {
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
				assertChecksumClose(
					labChecksum(
						count,
						(index) => lightness[index]!,
						(index) => aAxis[index]!,
						(index) => bAxis[index]!,
					),
					wanted,
					count,
				);
			},
		);
	}

	{
		const bytes = rgbaBytes(count);
		const lightness = new Float64Array(count);
		const aAxis = new Float64Array(count);
		const bAxis = new Float64Array(count);
		register(
			"ImageData RGBA → planes, fused kernel, no LUT",
			{ input: "u8 rgba", output: "f64 planes", kernel: "fused" },
			() => {
				for (let index = 0; index < count; index++) {
					const at = index * 4;
					const r = srgbToLinear(bytes[at]! / 255);
					const g = srgbToLinear(bytes[at + 1]! / 255);
					const b = srgbToLinear(bytes[at + 2]! / 255);
					const l = Math.cbrt(K.lR * r + K.lG * g + K.lB * b);
					const m = Math.cbrt(K.mR * r + K.mG * g + K.mB * b);
					const s = Math.cbrt(K.sR * r + K.sG * g + K.sB * b);
					lightness[index] = K.labLl * l + K.labLm * m + K.labLs * s;
					aAxis[index] = K.labAl * l + K.labAm * m + K.labAs * s;
					bAxis[index] = K.labBl * l + K.labBm * m + K.labBs * s;
				}
				assertChecksumClose(
					labChecksum(
						count,
						(index) => lightness[index]!,
						(index) => aAxis[index]!,
						(index) => bAxis[index]!,
					),
					wanted,
					count,
				);
			},
		);
	}

	{
		const packed = packedRgb(count);
		const lightness = new Float64Array(count);
		const aAxis = new Float64Array(count);
		const bAxis = new Float64Array(count);
		register(
			"packed Uint32Array → planes, fused kernel + LUT",
			{ input: "u32 packed", output: "f64 planes", kernel: "fused" },
			() => {
				for (let index = 0; index < count; index++) {
					const rgb = packed[index]!;
					const r = LINEAR_FROM_BYTE[(rgb >>> 16) & 0xff]!;
					const g = LINEAR_FROM_BYTE[(rgb >>> 8) & 0xff]!;
					const b = LINEAR_FROM_BYTE[rgb & 0xff]!;
					const l = Math.cbrt(K.lR * r + K.lG * g + K.lB * b);
					const m = Math.cbrt(K.mR * r + K.mG * g + K.mB * b);
					const s = Math.cbrt(K.sR * r + K.sG * g + K.sB * b);
					lightness[index] = K.labLl * l + K.labLm * m + K.labLs * s;
					aAxis[index] = K.labAl * l + K.labAm * m + K.labAs * s;
					bAxis[index] = K.labBl * l + K.labBm * m + K.labBs * s;
				}
				assertChecksumClose(
					labChecksum(
						count,
						(index) => lightness[index]!,
						(index) => aAxis[index]!,
						(index) => bAxis[index]!,
					),
					wanted,
					count,
				);
			},
		);
	}

	return wanted;
}

durationCondition(
	`sRGB → OKLab — ${SMALL_IMAGE.toLocaleString("en-US")} pixels (512×512)`,
	{ sampling: COLOR_SAMPLING },
	() => {
		registerContenders_(SMALL_IMAGE, (name, tags, run) =>
			durationCase(name, { tags }, run),
		);
	},
);

resourceCondition(
	`sRGB → OKLab — ${SMALL_IMAGE.toLocaleString("en-US")} pixels — allocation`,
	() => {
		registerContenders_(SMALL_IMAGE, (name, tags, run) =>
			resourceCase(name, { tags }, run),
		);
	},
);
