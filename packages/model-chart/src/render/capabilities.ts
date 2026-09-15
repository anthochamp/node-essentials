import type { Channel } from "../spec/channel.js";
import type { CoordKind } from "../spec/coord.js";
import type { Mark } from "../spec/mark.js";
import type { PlotSpec } from "../spec/plot.js";
import type { TransformSpec } from "../spec/transform.js";

/**
 * What an output medium can actually draw.
 *
 * A terminal is a grid of character cells with roughly a one-to-two aspect
 * ratio and, at best, two-by-four subcell resolution through braille; a canvas
 * is continuous and unbounded. Rather than let each renderer discover it cannot
 * honour a spec halfway through, it declares its limits up front and
 * {@link resolvePlot} picks something it can draw.
 */
export type RendererCapabilities = {
	marks: ReadonlySet<Mark>;
	coords: ReadonlySet<CoordKind>;
	channels: ReadonlySet<Channel>;
	transforms: ReadonlySet<TransformSpec["kind"]>;
	/** Bits of colour available. `0` means none, so schemes map to glyph ramps. */
	colorDepth: 0 | 4 | 8 | 24;
	/** `false` when positions quantise to discrete cells rather than to points. */
	continuous: boolean;
	/**
	 * Beyond this, a renderer would produce an unreadable result. Unbounded when
	 * absent.
	 */
	maxMarks?: number;
};

/**
 * Everything in `spec` that `capabilities` cannot honour.
 *
 * @returns Human-readable reasons, empty when the spec is drawable. Intended
 *   for a diagnostic, not for control flow — use {@link canRender} for that.
 */
export function unsupportedFeatures(
	spec: PlotSpec,
	capabilities: RendererCapabilities,
): string[] {
	const reasons: string[] = [];

	if (!capabilities.marks.has(spec.mark)) {
		reasons.push(`mark "${spec.mark}"`);
	}

	const coordKind = spec.coord?.kind ?? "cartesian";
	if (!capabilities.coords.has(coordKind)) {
		reasons.push(`coordinate system "${coordKind}"`);
	}

	for (const channel of Object.keys(spec.encoding) as Channel[]) {
		if (!capabilities.channels.has(channel)) {
			reasons.push(`channel "${channel}"`);
		}
	}

	for (const transform of spec.transform ?? []) {
		if (!capabilities.transforms.has(transform.kind)) {
			reasons.push(`transform "${transform.kind}"`);
		}
	}

	return reasons;
}

/**
 * Whether `capabilities` can honour every part of `spec`.
 *
 * The control-flow form of {@link unsupportedFeatures}, which is the one to
 * call when you want to tell a reader _why_ not.
 *
 * O(channels + transforms) in the spec.
 */
export function canRender(
	spec: PlotSpec,
	capabilities: RendererCapabilities,
): boolean {
	return unsupportedFeatures(spec, capabilities).length === 0;
}

/**
 * The first spec in `spec`'s fallback chain that `capabilities` can draw.
 *
 * @returns `null` when nothing in the chain is drawable, which is the signal to
 *   apply the universal fallback and render the underlying frame as a table.
 */
export function resolvePlot(
	spec: PlotSpec,
	capabilities: RendererCapabilities,
): PlotSpec | null {
	const pending: PlotSpec[] = [spec];
	// A fallback chain is plain data and could be built cyclically by mistake.
	const seen = new Set<PlotSpec>();

	while (pending.length > 0) {
		const candidate = pending.shift() as PlotSpec;
		if (seen.has(candidate)) {
			continue;
		}
		seen.add(candidate);

		if (canRender(candidate, capabilities)) {
			return candidate;
		}
		pending.push(...(candidate.fallback ?? []));
	}

	return null;
}
