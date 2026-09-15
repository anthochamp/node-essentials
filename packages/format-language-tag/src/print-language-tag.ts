import type { LanguageTag } from "./language-tag.js";

/**
 * Serialises a language tag.
 *
 * The result is in the case convention RFC 5646 §2.1.1 recommends, whatever the
 * tag was parsed from, because case is not part of a tag's identity.
 */
export function printLanguageTag(tag: LanguageTag): string {
	switch (tag.kind) {
		case "irregular":
			return tag.text;
		case "privateUse":
			return ["x", ...tag.subtags].join("-");
		case "langtag": {
			const parts = [tag.language, ...tag.extlangs];
			if (tag.script !== null) {
				parts.push(tag.script);
			}
			if (tag.region !== null) {
				parts.push(tag.region);
			}
			parts.push(...tag.variants);
			for (const extension of tag.extensions) {
				parts.push(extension.singleton, ...extension.subtags);
			}
			if (tag.privateUse.length > 0) {
				parts.push("x", ...tag.privateUse);
			}
			return parts.join("-");
		}
	}
}
