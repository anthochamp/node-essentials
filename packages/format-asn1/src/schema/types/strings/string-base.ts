import type { AnyConstraintDef } from "../../constraints/common.js";
import { Asn1TypeDefBase } from "../../def.js";
import { AnyAsn1TypeDef } from "../any-def.js";

/** String-def discriminants supported by ASN.1 string schema descriptors. */
export type Asn1StringKind =
	| "utf8String"
	| "numericString"
	| "printableString"
	| "teletexString"
	| "videotexString"
	| "ia5String"
	| "graphicString"
	| "visibleString"
	| "generalString"
	| "universalString"
	| "bmpString";

/** Shared shape for every string-family type descriptor. */
export type Asn1StringKindDef<K extends Asn1StringKind = Asn1StringKind> =
	Asn1TypeDefBase<K, string> & {
		readonly constraints?: readonly AnyConstraintDef[];
	};

/**
 * Shared `.size()`/`.alphabet()`/`.pattern()`/`.constrainedBy()` methods for
 * the string family.
 */
export interface StringMethods<S> {
	/** Add a SIZE constraint. */
	size(minOrFixed: bigint | number, max?: bigint | number | "MAX"): S;
	/** Add a PERMITTED ALPHABET (`FROM`) constraint. */
	alphabet(chars: string): S;
	/** Add a PATTERN constraint. */
	pattern(pat: string): S;
	/** Append a user-defined constraint. */
	constrainedBy(description: string): S;
}

/**
 * Attach the shared string-family constraint methods to `def`, rewrapping via
 * `rewrap`.
 */
export function attachStringMethods<
	D extends AnyAsn1TypeDef & {
		readonly constraints?: readonly AnyConstraintDef[];
	},
	S,
>(def: D, rewrap: (newDef: D) => S): StringMethods<S> {
	const append = (c: AnyConstraintDef): S =>
		rewrap({ ...def, constraints: [...(def.constraints ?? []), c] });
	return {
		size: (minOrFixed, max) => {
			const minVal =
				typeof minOrFixed === "number" ? BigInt(minOrFixed) : minOrFixed;
			const maxVal =
				max === undefined
					? minVal
					: max === "MAX"
						? "MAX"
						: typeof max === "number"
							? BigInt(max)
							: max;
			return append({ kind: "size", min: minVal, max: maxVal });
		},
		alphabet: (chars) => append({ kind: "permittedAlphabet", alphabet: chars }),
		pattern: (pat) => append({ kind: "pattern", pattern: pat }),
		constrainedBy: (description) =>
			append({ kind: "userDefinedConstraint", description }),
	};
}
