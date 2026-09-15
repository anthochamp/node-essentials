import type { NearestColorFinder, Rgb8 } from "@ac-kit/math-color";
import { createNearestColorFinder, rgb8ToOklab } from "@ac-kit/math-color";

const CUBE_LEVELS_ = [0, 95, 135, 175, 215, 255];

type PaletteEntry_ = { index: number; color: Rgb8 };

function buildExtendedPalette(): readonly PaletteEntry_[] {
	const entries: PaletteEntry_[] = [];

	// 6x6x6 color cube, indices 16-231.
	for (let r = 0; r < 6; r++) {
		for (let g = 0; g < 6; g++) {
			for (let b = 0; b < 6; b++) {
				entries.push({
					index: 16 + 36 * r + 6 * g + b,
					color: {
						r8: CUBE_LEVELS_[r]!,
						g8: CUBE_LEVELS_[g]!,
						b8: CUBE_LEVELS_[b]!,
					},
				});
			}
		}
	}

	// 24-step grayscale ramp, indices 232-255.
	for (let step = 0; step < 24; step++) {
		const level = 8 + 10 * step;
		entries.push({
			index: 232 + step,
			color: { r8: level, g8: level, b8: level },
		});
	}

	return entries;
}

let finder: NearestColorFinder<PaletteEntry_> | null = null;

/**
 * The nearest xterm 256-color palette index (16-255: the 6×6×6 color cube or
 * the 24-step grayscale ramp) for `color`, by OKLab (perceptual) distance.
 *
 * Indices 0-15 (basic/bright) are covered separately by `nearestAnsi16`, for
 * the depth that can only render that smaller palette.
 *
 * The 240-entry palette is built and converted on first use — importing this
 * module costs nothing for a caller that never downsamples.
 */
export function nearestAnsi256(color: Rgb8): number {
	finder ??= createNearestColorFinder(buildExtendedPalette(), (entry) =>
		rgb8ToOklab(entry.color),
	);
	return finder(rgb8ToOklab(color)).index;
}
