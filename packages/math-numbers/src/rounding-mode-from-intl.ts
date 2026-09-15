import { RoundingMode } from "./rounding-mode.js";

/** `Intl`'s nine names for the modes this package spells its own way. */
const FROM_INTL_: Readonly<Record<string, RoundingMode>> = {
	ceil: "ceiling",
	floor: "floor",
	expand: "up",
	trunc: "down",
	halfCeil: "half-ceiling",
	halfFloor: "half-floor",
	halfExpand: "half-up",
	halfTrunc: "half-down",
	halfEven: "half-even",
};

/**
 * Translates `Intl.NumberFormatOptions.roundingMode` into this package's
 * {@link RoundingMode}.
 *
 * The two sets agree on nine modes under different spellings; the two this one
 * has beyond them — `unnecessary` and `half-odd` — are arithmetic policies
 * rather than rendering ones, so `Intl` names neither and nothing maps to
 * them.
 *
 * @param mode The resolved `Intl` mode. `Intl` defaults to `halfExpand`.
 * @returns The matching rounding mode.
 */
export function roundingModeFromIntl(mode: string | undefined): RoundingMode {
	return FROM_INTL_[mode ?? "halfExpand"] ?? "half-up";
}
