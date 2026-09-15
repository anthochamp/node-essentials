import type { Rgb8 } from "@ac-kit/math-color";

export type CssColorName =
	| "aliceblue"
	| "antiquewhite"
	| "aquamarine"
	| "azure"
	| "beige"
	| "bisque"
	| "black"
	| "blanchedalmond"
	| "blue"
	| "blueviolet"
	| "brown"
	| "burlywood"
	| "cadetblue"
	| "chartreuse"
	| "chocolate"
	| "coral"
	| "cornflowerblue"
	| "cornsilk"
	| "crimson"
	| "cyan"
	| "darkblue"
	| "darkcyan"
	| "darkgoldenrod"
	| "darkgray"
	| "darkgreen"
	| "darkkhaki"
	| "darkmagenta"
	| "darkolivegreen"
	| "darkorange"
	| "darkorchid"
	| "darkred"
	| "darksalmon"
	| "darkseagreen"
	| "darkslateblue"
	| "darkslategray"
	| "darkturquoise"
	| "darkviolet"
	| "deeppink"
	| "deepskyblue"
	| "dimgray"
	| "dodgerblue"
	| "firebrick"
	| "floralwhite"
	| "forestgreen"
	| "gainsboro"
	| "ghostwhite"
	| "gold"
	| "goldenrod"
	| "gray"
	| "green"
	| "greenyellow"
	| "honeydew"
	| "hotpink"
	| "indianred"
	| "indigo"
	| "ivory"
	| "khaki"
	| "lavender"
	| "lavenderblush"
	| "lawngreen"
	| "lemonchiffon"
	| "lightblue"
	| "lightcoral"
	| "lightcyan"
	| "lightgoldenrodyellow"
	| "lightgreen"
	| "lightgrey"
	| "lightpink"
	| "lightsalmon"
	| "lightseagreen"
	| "lightskyblue"
	| "lightslategray"
	| "lightsteelblue"
	| "lightyellow"
	| "lime"
	| "limegreen"
	| "linen"
	| "magenta"
	| "maroon"
	| "mediumaquamarine"
	| "mediumblue"
	| "mediumorchid"
	| "mediumpurple"
	| "mediumseagreen"
	| "mediumslateblue"
	| "mediumspringgreen"
	| "mediumturquoise"
	| "mediumvioletred"
	| "midnightblue"
	| "mintcream"
	| "mistyrose"
	| "moccasin"
	| "navajowhite"
	| "navy"
	| "oldlace"
	| "olive"
	| "olivedrab"
	| "orange"
	| "orangered"
	| "orchid"
	| "palegoldenrod"
	| "palegreen"
	| "paleturquoise"
	| "palevioletred"
	| "papayawhip"
	| "peachpuff"
	| "peru"
	| "pink"
	| "plum"
	| "powderblue"
	| "purple"
	| "rebeccapurple"
	| "red"
	| "rosybrown"
	| "royalblue"
	| "saddlebrown"
	| "salmon"
	| "sandybrown"
	| "seagreen"
	| "seashell"
	| "sienna"
	| "silver"
	| "skyblue"
	| "slateblue"
	| "slategray"
	| "snow"
	| "springgreen"
	| "steelblue"
	| "tan"
	| "teal"
	| "thistle"
	| "tomato"
	| "turquoise"
	| "violet"
	| "wheat"
	| "white"
	| "whitesmoke"
	| "yellow"
	| "yellowgreen";

export type CssColorAliasName =
	| "aqua"
	| "fuchsia"
	| "grey"
	| "darkgrey"
	| "lightgray"
	| "dimgrey"
	| "darkslategrey"
	| "slategrey"
	| "lightslategrey";

export const CSS_COLOR_ALIASES: Readonly<
	Record<CssColorAliasName, CssColorName>
> = {
	aqua: "cyan",
	fuchsia: "magenta",
	grey: "gray",
	darkgrey: "darkgray",
	lightgray: "lightgrey",
	dimgrey: "dimgray",
	darkslategrey: "darkslategray",
	slategrey: "slategray",
	lightslategrey: "lightslategray",
};

export type CssNamedColor = {
	name: CssColorName;
	color: Rgb8;
};

export const CSS_NAMED_COLORS = new Map<CssColorName, Rgb8>([
	["aliceblue", { r8: 0xf0, g8: 0xf8, b8: 0xff }],
	["antiquewhite", { r8: 0xfa, g8: 0xeb, b8: 0xd7 }],
	["aquamarine", { r8: 0x7f, g8: 0xff, b8: 0xd4 }],
	["azure", { r8: 0xf0, g8: 0xff, b8: 0xff }],
	["beige", { r8: 0xf5, g8: 0xf5, b8: 0xdc }],
	["bisque", { r8: 0xff, g8: 0xe4, b8: 0xc4 }],
	["black", { r8: 0x00, g8: 0x00, b8: 0x00 }],
	["blanchedalmond", { r8: 0xff, g8: 0xeb, b8: 0xcd }],
	["blue", { r8: 0x00, g8: 0x00, b8: 0xff }],
	["blueviolet", { r8: 0x8a, g8: 0x2b, b8: 0xe2 }],
	["brown", { r8: 0xa5, g8: 0x2a, b8: 0x2a }],
	["burlywood", { r8: 0xde, g8: 0xb8, b8: 0x87 }],
	["cadetblue", { r8: 0x5f, g8: 0x9e, b8: 0xa0 }],
	["chartreuse", { r8: 0x7f, g8: 0xff, b8: 0x00 }],
	["chocolate", { r8: 0xd2, g8: 0x69, b8: 0x1e }],
	["coral", { r8: 0xff, g8: 0x7f, b8: 0x50 }],
	["cornflowerblue", { r8: 0x64, g8: 0x95, b8: 0xed }],
	["cornsilk", { r8: 0xff, g8: 0xf8, b8: 0xdc }],
	["crimson", { r8: 0xdc, g8: 0x14, b8: 0x3c }],
	["cyan", { r8: 0x00, g8: 0xff, b8: 0xff }],
	["darkblue", { r8: 0x00, g8: 0x00, b8: 0x8b }],
	["darkcyan", { r8: 0x00, g8: 0x8b, b8: 0x8b }],
	["darkgoldenrod", { r8: 0xb8, g8: 0x86, b8: 0x0b }],
	["darkgray", { r8: 0xa9, g8: 0xa9, b8: 0xa9 }],
	["darkgreen", { r8: 0x00, g8: 0x64, b8: 0x00 }],
	["darkkhaki", { r8: 0xbd, g8: 0xb7, b8: 0x6b }],
	["darkmagenta", { r8: 0x8b, g8: 0x00, b8: 0x8b }],
	["darkolivegreen", { r8: 0x55, g8: 0x6b, b8: 0x2f }],
	["darkorange", { r8: 0xff, g8: 0x8c, b8: 0x00 }],
	["darkorchid", { r8: 0x99, g8: 0x32, b8: 0xcc }],
	["darkred", { r8: 0x8b, g8: 0x00, b8: 0x00 }],
	["darksalmon", { r8: 0xe9, g8: 0x96, b8: 0x7a }],
	["darkseagreen", { r8: 0x8f, g8: 0xbc, b8: 0x8f }],
	["darkslateblue", { r8: 0x48, g8: 0x3d, b8: 0x8b }],
	["darkslategray", { r8: 0x2f, g8: 0x4f, b8: 0x4f }],
	["darkturquoise", { r8: 0x00, g8: 0xce, b8: 0xd1 }],
	["darkviolet", { r8: 0x94, g8: 0x00, b8: 0xd3 }],
	["deeppink", { r8: 0xff, g8: 0x14, b8: 0x93 }],
	["deepskyblue", { r8: 0x00, g8: 0xbf, b8: 0xff }],
	["dimgray", { r8: 0x69, g8: 0x69, b8: 0x69 }],
	["dodgerblue", { r8: 0x1e, g8: 0x90, b8: 0xff }],
	["firebrick", { r8: 0xb2, g8: 0x22, b8: 0x22 }],
	["floralwhite", { r8: 0xff, g8: 0xfa, b8: 0xf0 }],
	["forestgreen", { r8: 0x22, g8: 0x8b, b8: 0x22 }],
	["gainsboro", { r8: 0xdc, g8: 0xdc, b8: 0xdc }],
	["ghostwhite", { r8: 0xf8, g8: 0xf8, b8: 0xff }],
	["gold", { r8: 0xff, g8: 0xd7, b8: 0x00 }],
	["goldenrod", { r8: 0xda, g8: 0xa5, b8: 0x20 }],
	["gray", { r8: 0x80, g8: 0x80, b8: 0x80 }],
	["green", { r8: 0x00, g8: 0x80, b8: 0x00 }],
	["greenyellow", { r8: 0xad, g8: 0xff, b8: 0x2f }],
	["honeydew", { r8: 0xf0, g8: 0xff, b8: 0xf0 }],
	["hotpink", { r8: 0xff, g8: 0x69, b8: 0xb4 }],
	["indianred", { r8: 0xcd, g8: 0x5c, b8: 0x5c }],
	["indigo", { r8: 0x4b, g8: 0x00, b8: 0x82 }],
	["ivory", { r8: 0xff, g8: 0xff, b8: 0xf0 }],
	["khaki", { r8: 0xf0, g8: 0xe6, b8: 0x8c }],
	["lavender", { r8: 0xe6, g8: 0xe6, b8: 0xfa }],
	["lavenderblush", { r8: 0xff, g8: 0xf0, b8: 0xf5 }],
	["lawngreen", { r8: 0x7c, g8: 0xfc, b8: 0x00 }],
	["lemonchiffon", { r8: 0xff, g8: 0xfa, b8: 0xcd }],
	["lightblue", { r8: 0xad, g8: 0xd8, b8: 0xe6 }],
	["lightcoral", { r8: 0xf0, g8: 0x80, b8: 0x80 }],
	["lightcyan", { r8: 0xe0, g8: 0xff, b8: 0xff }],
	["lightgoldenrodyellow", { r8: 0xfa, g8: 0xfa, b8: 0xd2 }],
	["lightgreen", { r8: 0x90, g8: 0xee, b8: 0x90 }],
	["lightgrey", { r8: 0xd3, g8: 0xd3, b8: 0xd3 }],
	["lightpink", { r8: 0xff, g8: 0xb6, b8: 0xc1 }],
	["lightsalmon", { r8: 0xff, g8: 0xa0, b8: 0x7a }],
	["lightseagreen", { r8: 0x20, g8: 0xb2, b8: 0xaa }],
	["lightskyblue", { r8: 0x87, g8: 0xce, b8: 0xfa }],
	["lightslategray", { r8: 0x77, g8: 0x88, b8: 0x99 }],
	["lightsteelblue", { r8: 0xb0, g8: 0xc4, b8: 0xde }],
	["lightyellow", { r8: 0xff, g8: 0xff, b8: 0xe0 }],
	["lime", { r8: 0x00, g8: 0xff, b8: 0x00 }],
	["limegreen", { r8: 0x32, g8: 0xcd, b8: 0x32 }],
	["linen", { r8: 0xfa, g8: 0xf0, b8: 0xe6 }],
	["magenta", { r8: 0xff, g8: 0x00, b8: 0xff }],
	["maroon", { r8: 0x80, g8: 0x00, b8: 0x00 }],
	["mediumaquamarine", { r8: 0x66, g8: 0xcd, b8: 0xaa }],
	["mediumblue", { r8: 0x00, g8: 0x00, b8: 0xcd }],
	["mediumorchid", { r8: 0xba, g8: 0x55, b8: 0xd3 }],
	["mediumpurple", { r8: 0x93, g8: 0x70, b8: 0xdb }],
	["mediumseagreen", { r8: 0x3c, g8: 0xb3, b8: 0x71 }],
	["mediumslateblue", { r8: 0x7b, g8: 0x68, b8: 0xee }],
	["mediumspringgreen", { r8: 0x00, g8: 0xfa, b8: 0x9a }],
	["mediumturquoise", { r8: 0x48, g8: 0xd1, b8: 0xcc }],
	["mediumvioletred", { r8: 0xc7, g8: 0x15, b8: 0x85 }],
	["midnightblue", { r8: 0x19, g8: 0x19, b8: 0x70 }],
	["mintcream", { r8: 0xf5, g8: 0xff, b8: 0xfa }],
	["mistyrose", { r8: 0xff, g8: 0xe4, b8: 0xe1 }],
	["moccasin", { r8: 0xff, g8: 0xe4, b8: 0xb5 }],
	["navajowhite", { r8: 0xff, g8: 0xde, b8: 0xad }],
	["navy", { r8: 0x00, g8: 0x00, b8: 0x80 }],
	["oldlace", { r8: 0xfd, g8: 0xf5, b8: 0xe6 }],
	["olive", { r8: 0x80, g8: 0x80, b8: 0x00 }],
	["olivedrab", { r8: 0x6b, g8: 0x8e, b8: 0x23 }],
	["orange", { r8: 0xff, g8: 0xa5, b8: 0x00 }],
	["orangered", { r8: 0xff, g8: 0x45, b8: 0x00 }],
	["orchid", { r8: 0xda, g8: 0x70, b8: 0xd6 }],
	["palegoldenrod", { r8: 0xee, g8: 0xe8, b8: 0xaa }],
	["palegreen", { r8: 0x98, g8: 0xfb, b8: 0x98 }],
	["paleturquoise", { r8: 0xaf, g8: 0xee, b8: 0xee }],
	["palevioletred", { r8: 0xdb, g8: 0x70, b8: 0x93 }],
	["papayawhip", { r8: 0xff, g8: 0xef, b8: 0xd5 }],
	["peachpuff", { r8: 0xff, g8: 0xda, b8: 0xb9 }],
	["peru", { r8: 0xcd, g8: 0x85, b8: 0x3f }],
	["pink", { r8: 0xff, g8: 0xc0, b8: 0xcb }],
	["plum", { r8: 0xdd, g8: 0xa0, b8: 0xdd }],
	["powderblue", { r8: 0xb0, g8: 0xe0, b8: 0xe6 }],
	["purple", { r8: 0x80, g8: 0x00, b8: 0x80 }],
	["rebeccapurple", { r8: 0x66, g8: 0x33, b8: 0x99 }],
	["red", { r8: 0xff, g8: 0x00, b8: 0x00 }],
	["rosybrown", { r8: 0xbc, g8: 0x8f, b8: 0x8f }],
	["royalblue", { r8: 0x41, g8: 0x69, b8: 0xe1 }],
	["saddlebrown", { r8: 0x8b, g8: 0x45, b8: 0x13 }],
	["salmon", { r8: 0xfa, g8: 0x80, b8: 0x72 }],
	["sandybrown", { r8: 0xf4, g8: 0xa4, b8: 0x60 }],
	["seagreen", { r8: 0x2e, g8: 0x8b, b8: 0x57 }],
	["seashell", { r8: 0xff, g8: 0xf5, b8: 0xee }],
	["sienna", { r8: 0xa0, g8: 0x52, b8: 0x2d }],
	["silver", { r8: 0xc0, g8: 0xc0, b8: 0xc0 }],
	["skyblue", { r8: 0x87, g8: 0xce, b8: 0xeb }],
	["slateblue", { r8: 0x6a, g8: 0x5a, b8: 0xcd }],
	["slategray", { r8: 0x70, g8: 0x80, b8: 0x90 }],
	["snow", { r8: 0xff, g8: 0xfa, b8: 0xfa }],
	["springgreen", { r8: 0x00, g8: 0xff, b8: 0x7f }],
	["steelblue", { r8: 0x46, g8: 0x82, b8: 0xb4 }],
	["tan", { r8: 0xd2, g8: 0xb4, b8: 0x8c }],
	["teal", { r8: 0x00, g8: 0x80, b8: 0x80 }],
	["thistle", { r8: 0xd8, g8: 0xbf, b8: 0xd8 }],
	["tomato", { r8: 0xff, g8: 0x63, b8: 0x47 }],
	["turquoise", { r8: 0x40, g8: 0xe0, b8: 0xd0 }],
	["violet", { r8: 0xee, g8: 0x82, b8: 0xee }],
	["wheat", { r8: 0xf5, g8: 0xde, b8: 0xb3 }],
	["white", { r8: 0xff, g8: 0xff, b8: 0xff }],
	["whitesmoke", { r8: 0xf5, g8: 0xf5, b8: 0xf5 }],
	["yellow", { r8: 0xff, g8: 0xff, b8: 0x00 }],
	["yellowgreen", { r8: 0x9a, g8: 0xcd, b8: 0x32 }],
]);

/** Every spelling the spec defines, aliases excluded. */
export function cssNamedColorNames(): Set<string> {
	return new Set(CSS_NAMED_COLORS.keys());
}

/**
 * The value a CSS colour keyword names, following aliases.
 *
 * @returns `null` for a keyword the spec does not define.
 */
export function cssNamedColor(name: string): Rgb8 | null {
	const lowerCasedName = name.toLowerCase() as CssColorName | CssColorAliasName;

	const canonical =
		CSS_COLOR_ALIASES[lowerCasedName as CssColorAliasName] ?? lowerCasedName;

	return CSS_NAMED_COLORS.get(canonical) ?? null;
}

/**
 * Given a CSS colour keyword, return the canonical spelling of it, following
 * aliases.
 *
 * Returns `null` for a keyword the spec does not define.
 */
export function cssNamedColorName(name: string): CssColorName | null {
	const lowerCasedName = name.toLowerCase() as CssColorName | CssColorAliasName;

	const canonical =
		CSS_COLOR_ALIASES[lowerCasedName as CssColorAliasName] ?? lowerCasedName;

	return CSS_NAMED_COLORS.has(canonical) ? canonical : null;
}
