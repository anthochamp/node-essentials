import type { Rgb8 } from "@ac-kit/math-color";
import { namedColorRamp, oklabToRgb8 } from "@ac-kit/math-color";
import type { DataFrame } from "@ac-kit/model-dataset";
import {
	columnCell,
	findDataFrameFieldIndexByName,
} from "@ac-kit/model-dataset";

/**
 * Green at the anchor through amber to red at the far end — the convention a
 * reader already has for "this is fine" through "this is not", which matters
 * more here than the perceptual uniformity a scientific ramp buys.
 */
const RAMP_NAME_ = "redYellowGreen";

/**
 * A colour per row, or `null` for a row with nothing to colour by.
 *
 * Rendering, not data: a renderer that cannot colour ignores it entirely.
 */
export type RowColors = readonly (Rgb8 | null)[];

/**
 * Colours rows by how far a ratio field departs from `1`.
 *
 * The scale is logarithmic and anchored at `1`, so half as fast and twice as
 * fast are the same distance from the anchor, and it maps the value rather than
 * the row's rank — three rows within a percent of each other come out the same
 * colour instead of being spread across the whole ramp just because there are
 * three of them.
 *
 * The domain runs from the anchor to the furthest row present, which is why the
 * table recolours as rows arrive: the far end is whatever the worst case so far
 * happens to be. A frame where every row sits at the anchor has a zero-width
 * domain and gets no colour at all — there is nothing to say.
 *
 * Runs in O(rows); the ramp itself is built once and cached by `math-color`.
 *
 * @returns One entry per row of `frame`, empty when it names no such field.
 */
export function ratioRowColors(frame: DataFrame, field: string): RowColors {
	const index = findDataFrameFieldIndexByName(frame, field);
	const column = frame.columns[index];
	if (index === -1 || column === undefined) {
		return [];
	}

	const distances: (number | null)[] = [];
	let furthest = 0;
	for (let rowIndex = 0; rowIndex < frame.rowCount; rowIndex++) {
		const value = columnCell(column, rowIndex);
		// A ratio is a positive quantity; anything else is a row that has not
		// reported one yet, not a row at the anchor.
		if (typeof value !== "number" || !(value > 0)) {
			distances.push(null);
			continue;
		}
		const distance = Math.abs(Math.log(value));
		distances.push(distance);
		furthest = Math.max(furthest, distance);
	}

	if (furthest === 0) {
		return distances.map(() => null);
	}

	const ramp = namedColorRamp(RAMP_NAME_);
	return distances.map((distance) =>
		distance === null ? null : oklabToRgb8(ramp(1 - distance / furthest)),
	);
}
