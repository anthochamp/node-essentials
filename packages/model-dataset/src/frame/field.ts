import type { NumberFormatSpec } from "../quantity/number-format.js";
import type { Unit } from "../quantity/unit.js";

/**
 * A field's measurement scale — what operations on its values are meaningful,
 * and therefore which visual channels it may drive.
 *
 * This is the type system a renderer reasons with: it never inspects a cell to
 * decide how to draw a field.
 */
export type FieldKind =
	/** Unordered categories. Equality only. */
	| "nominal"
	/** Ordered categories, with no distance between them. */
	| "ordinal"
	/** Continuous; differences and ratios are meaningful. */
	| "quantitative"
	/** Instants on a time axis. */
	| "temporal"
	/** Wraps at a period: an angle, a compass bearing, a time of day. */
	| "cyclic"
	/** A shape in a coordinate reference system. */
	| "geometry"
	/** An opaque key. Joinable, never plotted. */
	| "identifier";

/**
 * Which way is an improvement for a measured quantity.
 *
 * A property of the quantity, not of its unit — `latencyMs` and `batteryLifeMs`
 * share a unit and disagree here.
 */
export type FieldDirection = "lower-is-better" | "higher-is-better" | "neutral";

type FieldCommon = {
	/** Machine key, unique within a frame. Referenced by encodings and joins. */
	name: string;
	/** Human label. Falls back to `name` when absent. */
	title?: string;
	/** Longer prose for a tooltip, a legend caption or a screen reader. */
	description?: string;
	/** Whether the column may contain `null`. Default `true`. */
	nullable?: boolean;
	/**
	 * Literal text wrapped around the formatted value, never around a `null`
	 * cell's placeholder.
	 *
	 * Opaque: a `"±"` prefix does not make the value a magnitude, and a `"%"`
	 * suffix does not scale it — the producer guarantees that. These exist
	 * because `Intl.NumberFormatOptions` can express neither `±` nor `×`.
	 */
	prefix?: string;
	suffix?: string;
};

type NumericFieldCommon = FieldCommon & {
	unit?: Unit;
	format?: NumberFormatSpec;
	direction?: FieldDirection;
	/**
	 * Name of the field holding this one's uncertainty, as a half-width around it
	 * — the error bar a chart would draw, the `±` column a table would print.
	 *
	 * Points from the value to its uncertainty rather than the reverse, so a
	 * renderer that ignores uncertainty simply never follows the link, and a
	 * value with several candidate spreads still names the one that qualifies it.
	 * Use `lower`/`upper` bound fields instead where the interval is asymmetric.
	 */
	uncertaintyField?: string;
};

export type NominalFieldDescriptor = FieldCommon & { kind: "nominal" };

export type OrdinalFieldDescriptor = FieldCommon & {
	kind: "ordinal";
	/** Category order. Absent means order of first appearance. */
	domain?: readonly string[];
};

export type QuantitativeFieldDescriptor = NumericFieldCommon & {
	kind: "quantitative";
};

export type TemporalFieldDescriptor = NumericFieldCommon & {
	kind: "temporal";
	/**
	 * How an instant reads as text. Numeric cells are epoch milliseconds. Absent
	 * leaves the choice to the renderer.
	 */
	dateFormat?: Intl.DateTimeFormatOptions;
};

export type CyclicFieldDescriptor = NumericFieldCommon & {
	kind: "cyclic";
	/** Value at which the scale wraps: `360` for degrees, `24` for hours. */
	period: number;
};

export type GeometryFieldDescriptor = FieldCommon & {
	kind: "geometry";
	/**
	 * Coordinate reference system identifier, e.g. `"EPSG:4326"`. Absent means
	 * WGS 84, which is what GeoJSON fixes for interchange.
	 */
	crs?: string;
};

export type IdentifierFieldDescriptor = FieldCommon & { kind: "identifier" };

/**
 * One column's name, measurement scale and presentation metadata.
 *
 * A frame's schema is data, inspectable at runtime — which is what lets a
 * renderer decide what it can draw without being told.
 *
 * There is deliberately no `interval` kind: a span is two fields plus an
 * `x`/`x2` encoding, which keeps every column scalar and typed-array-capable. A
 * histogram is `binStart`/`binEnd`/`count`; a Gantt row is
 * `startedAt`/`endedAt`.
 */
export type FieldDescriptor =
	| NominalFieldDescriptor
	| OrdinalFieldDescriptor
	| QuantitativeFieldDescriptor
	| TemporalFieldDescriptor
	| CyclicFieldDescriptor
	| GeometryFieldDescriptor
	| IdentifierFieldDescriptor;

/**
 * Whether a field's values support arithmetic, and so can drive a continuous
 * scale.
 */
export function isNumericField(
	field: FieldDescriptor,
): field is
	| QuantitativeFieldDescriptor
	| TemporalFieldDescriptor
	| CyclicFieldDescriptor {
	return (
		field.kind === "quantitative" ||
		field.kind === "temporal" ||
		field.kind === "cyclic"
	);
}

/**
 * Whether a field's values form a discrete set, and so map to a band or a
 * colour list.
 */
export function isCategoricalField(
	field: FieldDescriptor,
): field is NominalFieldDescriptor | OrdinalFieldDescriptor {
	return field.kind === "nominal" || field.kind === "ordinal";
}
