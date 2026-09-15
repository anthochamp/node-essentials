import { isObject } from "@ac-kit/core";

import type { MeasureId } from "../common/measure-data.js";
import { fallbackPlugin } from "./fallback-plugin.js";
import type { MeasurePlugin } from "./plugin.js";
import { MEASURE_PLUGIN_TAG } from "./plugin.js";

/**
 * Checks the `MEASURE_PLUGIN_TAG` brand rather than validating each member's
 * shape — a dynamically-loaded module's default export either went through
 * `defineMeasurePlugin`/`fallbackAdapter`, or it did not.
 */
export function isMeasurePlugin(value: unknown): value is MeasurePlugin {
	return isObject(value) && MEASURE_PLUGIN_TAG in value;
}

/**
 * Registered `MeasurePlugin`s, keyed by measure id. Mutates as plugins are
 * registered, so this is a class rather than a factory function.
 */
export class MeasureRegistry {
	private readonly plugins = new Map<MeasureId, MeasurePlugin>();

	register(plugin: MeasurePlugin): void {
		this.plugins.set(plugin.id, plugin);
	}

	/** Never throws. Unknown ids resolve to a generic fallback. */
	resolve(id: MeasureId): MeasurePlugin {
		return this.plugins.get(id) ?? fallbackPlugin(id);
	}

	has(id: MeasureId): boolean {
		return this.plugins.has(id);
	}

	ids(): readonly MeasureId[] {
		return [...this.plugins.keys()];
	}
}
