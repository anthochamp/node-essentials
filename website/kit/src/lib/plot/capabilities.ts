import type { RendererCapabilities } from "@ac-kit/model-chart";

/**
 * What the Observable Plot adapter can draw today.
 *
 * Deliberately narrow. Declaring a mark here is a promise that
 * {@link renderPlotSpec} maps it, and an undeclared one makes `resolvePlot` walk
 * the spec's fallback chain instead of producing a broken chart — which is the
 * whole reason `model-chart` asks a renderer to state its limits up front.
 *
 * Widen it only together with the corresponding branch in the renderer.
 */
export const OBSERVABLE_PLOT_CAPABILITIES: RendererCapabilities = {
	marks: new Set(["line", "point", "area", "rule", "bar", "tick", "text"]),
	coords: new Set(["cartesian"]),
	channels: new Set([
		"x",
		"x2",
		"y",
		"y2",
		"color",
		"opacity",
		"size",
		"shape",
		"text",
		"detail",
	]),
	// Every transform is `model-chart`'s to resolve, and none of that pipeline
	// is built yet; a spec carrying one is not drawable here.
	transforms: new Set(),
	colorDepth: 24,
	continuous: true,
};
