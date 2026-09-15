import { cssNamedColorName, type CssColorName } from "./named-colors.js";

/**
 * Display labels for the CSS colour keywords, in one language.
 *
 * A keyword is an identifier, not a label: `mediumvioletred` is a token, not
 * something to show a reader. Tables of labels are shipped per locale under
 * `@ac-kit/format-css-color/names/<locale>`, so importing one language never
 * pulls in the rest.
 */
export type CssColorLabels = ReadonlyMap<CssColorName, string>;

/**
 * How `name` is presented to a reader, following aliases the same way
 * `cssNamedColor` does.
 *
 * @returns The keyword itself when `labels` has no entry for it, so a partial
 *   translation degrades to the identifier rather than to nothing.
 */
export function cssColorLabel(
	labels: CssColorLabels,
	name: Parameters<typeof cssNamedColorName>[0],
): string {
	const canonical = cssNamedColorName(name);
	if (!canonical) {
		return name;
	}

	return labels.get(canonical) ?? name;
}
