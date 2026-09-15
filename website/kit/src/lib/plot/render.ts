import type { EncodingSpec, PlotSpec, ScaleSpec } from "@ac-kit/model-chart";
import { isFieldEncoding, resolvePlot } from "@ac-kit/model-chart";
import type { DataFrame } from "@ac-kit/model-dataset";
import { getDataFrameColumnByName } from "@ac-kit/model-dataset";
import * as Plot from "@observablehq/plot";

import { OBSERVABLE_PLOT_CAPABILITIES } from "./capabilities.js";

/** Raised when nothing in a spec's fallback chain can be drawn. */
export class UndrawableSpecError extends Error {
	constructor(readonly reasons: string[]) {
		super(`No spec in the fallback chain is drawable: ${reasons.join(", ")}`);
		this.name = "UndrawableSpecError";
	}
}

type PlotScaleType = NonNullable<Plot.ScaleOptions["type"]>;

/**
 * Options common to every mark this adapter maps.
 *
 * Plot declares positional channels on each mark's own options type rather than
 * on the shared `MarkOptions`, so there is no built-in type covering "whichever
 * mark we are about to pick". Every field below is accepted by at least the
 * marks in {@link OBSERVABLE_PLOT_CAPABILITIES}.
 */
type ChannelOptions = Plot.MarkOptions & {
	x?: Plot.ChannelValue;
	y?: Plot.ChannelValue;
	x1?: Plot.ChannelValue;
	x2?: Plot.ChannelValue;
	y1?: Plot.ChannelValue;
	y2?: Plot.ChannelValue;
	z?: Plot.ChannelValue;
	text?: Plot.ChannelValue;
	curve?: Plot.Curve;
};

/**
 * `ScaleKind` to Plot's own scale vocabulary.
 *
 * The two agree on more than they disagree, and where they disagree it is
 * because `model-chart` names the intent and Plot names the mapping: `"time"`
 * is `"utc"` here because a spec that meant local time would have said so.
 */
const SCALE_TYPES = {
	linear: "linear",
	log: "log",
	pow: "pow",
	sqrt: "sqrt",
	symlog: "symlog",
	time: "utc",
	ordinal: "ordinal",
	band: "band",
	point: "point",
	quantile: "quantile",
	quantize: "quantize",
	threshold: "threshold",
	identity: "identity",
} as const satisfies Record<string, PlotScaleType>;

/** The scale a field encoding declares; a constant encoding has none. */
function scaleOf(encoding: EncodingSpec | undefined): ScaleSpec | undefined {
	return encoding !== undefined && isFieldEncoding(encoding)
		? encoding.scale
		: undefined;
}

/** `1e-45` rather than Plot's `0.000001y`, which the margin cannot hold. */
function exponentLabel(value: number): string {
	if (value === 0) {
		return "0";
	}
	const exponent = Math.round(Math.log10(Math.abs(value)));
	if (exponent >= -4 && exponent <= 4) {
		return String(value);
	}
	return `1e${exponent}`;
}

/** A constant encoding becomes a constant, a field encoding becomes a column. */
function channelOf(
	frame: DataFrame,
	encoding: EncodingSpec | undefined,
): unknown {
	if (encoding === undefined) {
		return undefined;
	}
	return isFieldEncoding(encoding)
		? getDataFrameColumnByName(frame, encoding.field)
		: encoding.value;
}

function scaleOptions(
	scale: ScaleSpec | undefined,
	axisTitle: string | undefined,
	grid: boolean | undefined,
): Plot.ScaleOptions {
	const options: Plot.ScaleOptions = {};
	if (axisTitle !== undefined) {
		options.label = axisTitle;
	}
	if (grid !== undefined) {
		options.grid = grid;
	}
	if (scale === undefined) {
		return options;
	}
	if (scale.kind !== undefined) {
		options.type = SCALE_TYPES[scale.kind];
	}
	if (scale.kind === "log") {
		// Plot's default SI words run to "0.0000001y" across many decades and are
		// then clipped by the margin; an exponent stays the same width whatever
		// the magnitude.
		options.tickFormat = exponentLabel;
	}
	if (scale.domain !== undefined) {
		options.domain = [...scale.domain] as Plot.ScaleOptions["domain"];
	}
	if (scale.zero !== undefined) {
		options.zero = scale.zero;
	}
	if (scale.nice !== undefined) {
		options.nice = scale.nice;
	}
	if (scale.clamp !== undefined) {
		options.clamp = scale.clamp;
	}
	if (scale.reverse !== undefined) {
		options.reverse = scale.reverse;
	}
	if (scale.exponent !== undefined) {
		options.exponent = scale.exponent;
	}
	if (scale.base !== undefined) {
		options.base = scale.base;
	}
	if (scale.padding !== undefined) {
		options.padding = scale.padding;
	}
	if (scale.scheme?.name !== undefined) {
		options.scheme = scale.scheme.name as Plot.ScaleOptions["scheme"];
	}
	if (scale.scheme?.reverse !== undefined) {
		options.reverse = scale.scheme.reverse;
	}
	return options;
}

/** Axis and legend intent that belongs to the plot rather than to a mark. */
function axisOf(encoding: EncodingSpec | undefined): {
	title?: string;
	grid?: boolean;
} {
	if (encoding === undefined || !isFieldEncoding(encoding)) {
		return {};
	}
	return {
		...(encoding.axis?.title === undefined
			? {}
			: { title: encoding.axis.title }),
		...(encoding.axis?.grid === undefined ? {} : { grid: encoding.axis.grid }),
	};
}

function markOf(
	spec: PlotSpec,
	frame: DataFrame,
	options: ChannelOptions,
	// Deliberately not part of `options`: `r` is a dot's radius but a bar's
	// corner radius, and the two take different types.
	radius: Plot.ChannelValue | undefined,
): Plot.Markish {
	// `{ length }` is Plot's columnar entry point: channels are read straight
	// from the frame's own arrays, with no row objects allocated in between.
	const data = { length: frame.rowCount };

	switch (spec.mark) {
		case "line":
			return Plot.line(data, options);
		case "area":
			return Plot.areaY(data, options);
		case "point":
			return Plot.dot(
				data,
				radius === undefined ? options : { ...options, r: radius },
			);
		case "bar":
			return Plot.barY(data, options);
		case "rule":
			return Plot.ruleY(data, options);
		case "tick":
			return Plot.tickY(data, options);
		case "text":
			return Plot.text(data, options);
		default:
			// Unreachable: the mark was checked against the capability set first.
			throw new UndrawableSpecError([`mark "${spec.mark}"`]);
	}
}

export type RenderPlotOptions = {
	width?: number;
	height?: number;
};

/**
 * Draws a `PlotSpec` over a `DataFrame` as an SVG element.
 *
 * Resolution goes through `model-chart`'s own `resolvePlot`, so a spec this
 * adapter cannot draw falls down its declared fallback chain rather than
 * failing outright. Only when the chain is exhausted does this throw, which is
 * the caller's signal to render the frame as a table instead.
 *
 * O(rows x channels): every channel is read from the frame's existing column
 * arrays, never transposed into row objects.
 *
 * @throws {UndrawableSpecError} When no spec in the fallback chain is drawable.
 */
export function renderPlotSpec(
	frame: DataFrame,
	spec: PlotSpec,
	options: RenderPlotOptions = {},
): (SVGSVGElement | HTMLElement) & Plot.Plot {
	const drawable = resolvePlot(spec, OBSERVABLE_PLOT_CAPABILITIES);
	if (drawable === null) {
		throw new UndrawableSpecError([spec.mark]);
	}

	const { encoding } = drawable;
	let radius: Plot.ChannelValue | undefined;
	const markOptions: ChannelOptions = {
		x: channelOf(frame, encoding.x) as Plot.ChannelValue,
		y: channelOf(frame, encoding.y) as Plot.ChannelValue,
	};
	if (encoding.x2 !== undefined) {
		markOptions.x1 = markOptions.x;
		markOptions.x2 = channelOf(frame, encoding.x2) as Plot.ChannelValue;
	}
	if (encoding.y2 !== undefined) {
		markOptions.y1 = markOptions.y;
		markOptions.y2 = channelOf(frame, encoding.y2) as Plot.ChannelValue;
	}
	if (encoding.color !== undefined) {
		const colorChannel = channelOf(frame, encoding.color) as Plot.ChannelValue;
		// A line takes colour on its stroke; a filled mark takes it on its fill.
		if (drawable.mark === "line" || drawable.mark === "rule") {
			markOptions.stroke = colorChannel;
		} else {
			markOptions.fill = colorChannel;
		}
	}
	if (encoding.opacity !== undefined) {
		markOptions.opacity = channelOf(
			frame,
			encoding.opacity,
		) as Plot.ChannelValue;
	}
	if (encoding.size !== undefined) {
		radius = channelOf(frame, encoding.size) as Plot.ChannelValue;
	}
	if (encoding.text !== undefined) {
		markOptions.text = channelOf(frame, encoding.text) as Plot.ChannelValue;
	}
	if (encoding.detail !== undefined) {
		markOptions.z = channelOf(frame, encoding.detail) as Plot.ChannelValue;
	}
	if (drawable.interpolate !== undefined && drawable.mark !== "point") {
		markOptions.curve = drawable.interpolate as Plot.CurveName;
	}

	const colorEncoding = encoding.color;
	const colorIsField =
		colorEncoding !== undefined && isFieldEncoding(colorEncoding);

	return Plot.plot({
		...(options.width === undefined ? {} : { width: options.width }),
		...(options.height === undefined ? {} : { height: options.height }),
		...(drawable.aspectRatio === undefined
			? {}
			: { aspectRatio: drawable.aspectRatio }),
		...(drawable.description === undefined
			? {}
			: { ariaLabel: drawable.description }),
		marginLeft: 60,
		marginBottom: 44,
		x: scaleOptions(
			scaleOf(encoding.x),
			axisOf(encoding.x).title,
			axisOf(encoding.x).grid,
		),
		y: scaleOptions(
			scaleOf(encoding.y),
			axisOf(encoding.y).title,
			axisOf(encoding.y).grid,
		),
		...(colorIsField
			? {
					color: {
						...scaleOptions(colorEncoding.scale, undefined, undefined),
						legend: colorEncoding.legend?.hidden !== true,
						...(colorEncoding.legend?.title === undefined
							? {}
							: { label: colorEncoding.legend.title }),
					},
				}
			: {}),
		marks: [
			Plot.frame({ stroke: "currentColor", strokeOpacity: 0.15 }),
			markOf(drawable, frame, markOptions, radius),
		],
	});
}

/** Field names a spec references, for a table fallback to project onto. */
export function specFieldNames(spec: PlotSpec): string[] {
	const names: string[] = [];
	for (const encoding of Object.values(spec.encoding)) {
		if (isFieldEncoding(encoding) && !names.includes(encoding.field)) {
			names.push(encoding.field);
		}
	}
	return names;
}
