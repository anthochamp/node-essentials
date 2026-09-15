import { Value } from "@ac-kit/model-dataset";

import type { ScaleSpec } from "./scale.js";

/** Whether and how a channel explains itself to a reader. */
export type LegendSpec = {
	title?: string;
	/** Suppresses the legend without dropping the encoding. */
	hidden?: boolean;
};

/** Whether and how a channel labels its own scale for a reader. */
export type AxisSpec = {
	title?: string;
	hidden?: boolean;
	/** Preferred tick count. A hint: the renderer owns the final choice. */
	tickCount?: number;
	/** Explicit tick positions, overriding any derived ones. */
	tickValues?: readonly Value[];
	grid?: boolean;
};

/**
 * Binds one field to one channel.
 *
 * A field reference, not a value: the frame owns the data, and the encoding
 * owns only the claim that this field drives this visual property.
 */
export type FieldEncoding = {
	field: string;
	scale?: ScaleSpec;
	axis?: AxisSpec;
	legend?: LegendSpec;
	/** Overrides the field's own `title` for this chart. */
	title?: string;
	/** Reorders a categorical domain by another field's aggregate. */
	sort?:
		| "ascending"
		| "descending"
		| null
		| { field: string; order?: "ascending" | "descending" };
};

/**
 * Pins a channel to a constant, with no field behind it — a fixed bar colour, a
 * zero baseline, a uniform point size.
 */
export type ValueEncoding = { value: Value };

/**
 * What drives one channel: a field from the frame, or a fixed value.
 *
 * Narrow it with {@link isFieldEncoding} before reading `field`.
 */
export type EncodingSpec = FieldEncoding | ValueEncoding;

/** Narrows an encoding to the field-backed form. */
export function isFieldEncoding(
	encoding: EncodingSpec,
): encoding is FieldEncoding {
	return "field" in encoding;
}
