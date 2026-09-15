import { isAsciiWhitespace } from "@ac-kit/core";
import { DEG_TO_RAD, TWO_PI } from "@ac-kit/math-scalar";

import type {
	CssAngleUnit,
	CssColor,
	CssColorFunction,
	CssColorSpace,
	CssComponent,
	CssMixSpace,
} from "./css-color.js";
import { CssColorSyntaxError } from "./errors.js";
import {
	CssColorAliasName,
	CssColorName,
	cssNamedColorName,
} from "./named-colors.js";

const COLOR_SPACES_ = new Set<CssColorSpace>([
	"srgb",
	"srgb-linear",
	"display-p3",
	"a98-rgb",
	"prophoto-rgb",
	"rec2020",
	"xyz",
	"xyz-d50",
	"xyz-d65",
]);

const MIX_SPACES_ = new Set<CssMixSpace>([
	...COLOR_SPACES_,
	"hsl",
	"hwb",
	"lab",
	"lch",
	"oklab",
	"oklch",
]);

const COLOR_FUNCTIONS_ = new Set<CssColorFunction>([
	"rgb",
	"hsl",
	"hwb",
	"lab",
	"lch",
	"oklab",
	"oklch",
]);

/** The legacy spellings, which the tree records through `legacy` instead. */
const FUNCTION_ALIASES_: Readonly<Record<string, CssColorFunction>> = {
	rgba: "rgb",
	hsla: "hsl",
};

/** Channel keywords each notation exposes to relative colour syntax. */
const CHANNELS_ = {
	rgb: ["r", "g", "b"],
	hsl: ["h", "s", "l"],
	hwb: ["h", "w", "b"],
	lab: ["l", "a", "b"],
	lch: ["l", "c", "h"],
	oklab: ["l", "a", "b"],
	oklch: ["l", "c", "h"],
	color: ["r", "g", "b"],
} as const satisfies Partial<
	Record<CssColorFunction | "color", readonly string[]>
>;

const ANGLE_UNITS_ = {
	deg: DEG_TO_RAD,
	grad: Math.PI / 200,
	rad: 1,
	turn: TWO_PI,
} as const satisfies Record<CssAngleUnit, number>;

// Sticky, so each is matched at the cursor without slicing the source first —
// slicing per token would make scanning quadratic in the length of the value.
const IDENT_ = /[a-zA-Z][a-zA-Z0-9-]*/y;
const HEX_ = /[0-9a-fA-F]{3,8}/y;
const NUMBER_ = /[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/iy;
const ANGLE_UNIT_ = /deg|grad|rad|turn/iy;

/**
 * Reads one CSS `<color>` and leaves the cursor after it.
 *
 * Hand-written rather than table-driven: the grammar is small, fixed by the
 * spec, and its awkward parts — the legacy comma forms, `/ alpha`, relative
 * colour syntax — are exactly the parts a generator makes harder to read.
 */
class Reader_ {
	private at = 0;

	constructor(private readonly source: string) {}

	get offset(): number {
		return this.at;
	}

	fail(detail: string): never {
		throw new CssColorSyntaxError(this.source, this.at, detail);
	}

	skipSpace(): void {
		while (
			this.at < this.source.length &&
			isAsciiWhitespace(this.source.charCodeAt(this.at))
		) {
			this.at++;
		}
	}

	atEnd(): boolean {
		this.skipSpace();
		return this.at >= this.source.length;
	}

	/** Consumes `text` when it is next, case-insensitively. */
	eat(text: string): boolean {
		this.skipSpace();
		if (
			this.source.slice(this.at, this.at + text.length).toLowerCase() ===
			text.toLowerCase()
		) {
			this.at += text.length;
			return true;
		}
		return false;
	}

	expect(text: string): void {
		if (!this.eat(text)) {
			this.fail(`expected ${JSON.stringify(text)}`);
		}
	}

	peek(): string {
		this.skipSpace();
		return this.source[this.at] ?? "";
	}

	/** An identifier, or the empty string when the next token is not one. */
	readIdent(): string {
		this.skipSpace();
		return this.match_(IDENT_) ?? "";
	}

	readHex(): CssColor {
		this.expect("#");
		const text = this.match_(HEX_) ?? "";
		const digits = text.length;
		if (digits !== 3 && digits !== 4 && digits !== 6 && digits !== 8) {
			this.at -= digits;
			this.fail("a hex colour takes 3, 4, 6 or 8 digits");
		}

		const short = digits === 3 || digits === 4;
		const channel = (index: number): number => {
			const slice = short
				? text[index]!.repeat(2)
				: text.slice(index * 2, index * 2 + 2);
			return Number.parseInt(slice, 16);
		};

		return {
			kind: "hex",
			r8: channel(0),
			g8: channel(1),
			b8: channel(2),
			a8: digits === 4 || digits === 8 ? channel(3) : 255,
			digits,
		};
	}

	/**
	 * One component. `channels` names the keywords relative colour syntax may use
	 * here; an empty list rejects them, which is what an absolute colour wants.
	 */
	readComponent(channels: readonly string[]): CssComponent {
		this.skipSpace();

		const ident = this.match_(IDENT_);
		if (ident !== null) {
			if (ident.toLowerCase() === "none") {
				return { kind: "none" };
			}
			if (channels.includes(ident.toLowerCase()) || ident === "alpha") {
				return { kind: "channel", name: ident.toLowerCase() };
			}
			this.fail(`unexpected identifier ${JSON.stringify(ident)}`);
		}

		const number = this.match_(NUMBER_);
		if (number === null) {
			this.fail("expected a number, a percentage or an identifier");
		}
		const value = Number.parseFloat(number);

		if (this.source[this.at] === "%") {
			this.at++;
			return { kind: "percentage", value };
		}

		const unit = this.match_(ANGLE_UNIT_);
		if (unit !== null) {
			return {
				kind: "angle",
				radians: value * ANGLE_UNITS_[unit.toLowerCase() as CssAngleUnit],
			};
		}

		return { kind: "number", value };
	}

	/** Matches a sticky pattern at the cursor, advancing past it on success. */
	private match_(pattern: RegExp): string | null {
		pattern.lastIndex = this.at;
		const match = pattern.exec(this.source);
		if (match === null) {
			return null;
		}
		this.at = pattern.lastIndex;
		return match[0];
	}

	readColor(): CssColor {
		this.skipSpace();

		if (this.peek() === "#") {
			return this.readHex();
		}

		const start = this.at;
		const ident = this.readIdent();
		if (ident === "") {
			this.fail("expected a colour");
		}

		const lower = ident.toLowerCase();
		if (this.peek() === "(") {
			if (lower === "color") {
				return this.readColorFunction_();
			}
			if (lower === "color-mix") {
				return this.readMix_();
			}
			const name = FUNCTION_ALIASES_[lower] ?? (lower as CssColorFunction);
			if (COLOR_FUNCTIONS_.has(name)) {
				return this.readFunction_(name);
			}
			this.at = start;
			this.fail(`unknown colour function ${JSON.stringify(ident)}`);
		}

		if (lower === "transparent") {
			return { kind: "transparent" };
		}
		if (lower === "currentcolor") {
			return { kind: "currentColor" };
		}

		const canonical = cssNamedColorName(
			lower as CssColorAliasName | CssColorName,
		);
		if (canonical) {
			return { kind: "named", name: canonical };
		}

		this.at = start;
		this.fail(`unknown colour keyword ${JSON.stringify(ident)}`);
	}

	private readOrigin_(): CssColor | null {
		const start = this.at;
		if (this.readIdent().toLowerCase() !== "from") {
			this.at = start;
			return null;
		}
		return this.readColor();
	}

	private readFunction_(name: CssColorFunction): CssColor {
		this.expect("(");
		const origin = this.readOrigin_();
		const channels = origin === null ? [] : CHANNELS_[name];

		const first = this.readComponent(channels);
		const legacy = this.peek() === ",";
		if (legacy) {
			this.expect(",");
		}
		const second = this.readComponent(channels);
		if (legacy) {
			this.expect(",");
		}
		const third = this.readComponent(channels);
		const alpha = this.readAlpha_(channels, legacy);
		this.expect(")");

		return {
			kind: "function",
			name,
			components: [first, second, third],
			alpha,
			origin,
			legacy,
		};
	}

	private readColorFunction_(): CssColor {
		this.expect("(");
		const origin = this.readOrigin_();
		const space = this.readIdent().toLowerCase() as CssColorSpace;
		if (!COLOR_SPACES_.has(space)) {
			this.fail(`unknown colour space ${JSON.stringify(space)}`);
		}

		const channels = origin === null ? [] : CHANNELS_.color;
		const components: [CssComponent, CssComponent, CssComponent] = [
			this.readComponent(channels),
			this.readComponent(channels),
			this.readComponent(channels),
		];
		const alpha = this.readAlpha_(channels, false);
		this.expect(")");

		return {
			kind: "color",
			space,
			components,
			alpha,
			origin,
		};
	}

	private readAlpha_(
		channels: readonly string[],
		legacy: boolean,
	): CssComponent | null {
		const separator = legacy ? "," : "/";
		if (this.peek() !== separator) {
			return null;
		}
		this.expect(separator);
		return this.readComponent(channels);
	}

	private readMix_(): CssColor {
		this.expect("(");
		this.expect("in");
		const space = this.readIdent().toLowerCase() as CssMixSpace;
		if (!MIX_SPACES_.has(space)) {
			this.fail(`unknown interpolation space ${JSON.stringify(space)}`);
		}
		this.expect(",");

		const first = this.readColor();
		const firstWeight = this.readWeight_();
		this.expect(",");
		const second = this.readColor();
		const secondWeight = this.readWeight_();
		this.expect(")");

		return {
			kind: "mix",
			space,
			first,
			firstWeight,
			second,
			secondWeight,
		};
	}

	private readWeight_(): number | null {
		this.skipSpace();
		const match = /^[+-]?(\d+\.?\d*|\.\d+)%/.exec(this.source.slice(this.at));
		if (!match) {
			return null;
		}
		this.at += match[0].length;
		return Number.parseFloat(match[0]);
	}
}

/**
 * Parses one CSS `<color>`.
 *
 * O(n) in the source length, single pass, no backtracking beyond one
 * identifier.
 *
 * @throws {CssColorSyntaxError} When the input is not a `<color>`, or carries
 *   trailing text.
 */
export function parseCssColor(source: string): CssColor {
	const reader = new Reader_(source);
	const color = reader.readColor();
	if (!reader.atEnd()) {
		reader.fail("unexpected trailing text");
	}
	return color;
}

/**
 * Parses one CSS `<color>`, or reports failure without throwing.
 *
 * For the common case of validating untrusted input, where a throw would be
 * control flow rather than an error.
 */
export function tryParseCssColor(source: string): CssColor | null {
	try {
		return parseCssColor(source);
	} catch (error) {
		if (error instanceof CssColorSyntaxError) {
			return null;
		}
		throw error;
	}
}
