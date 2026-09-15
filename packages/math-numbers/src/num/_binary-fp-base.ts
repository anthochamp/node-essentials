import {
	AlgebraicStructure,
	APPROXIMATE_ORDERED_FIELD,
	OrderedBase,
	Sign,
} from "@ac-kit/math-algebra";

import {
	FixedPrecisionInfo,
	IBinaryEncoded,
	IFixedPrecision,
} from "../precision-kind.js";
import { INum } from "./inum.js";

/**
 * Abstract base for all IEEE 754 binary floating-point numeric types.
 *
 * Extends {@link OrderedBase} (which declares abstract `cmp` and provides
 * concrete `eq`, `lt`, `lte`, `gt`, `gte`) and re-declares every method
 * required by {@link INum}, {@link IFixedPrecision} and {@link IBinaryEncoded} as
 * abstract, so concrete subclasses can use the `override` modifier on each
 * implementation.
 *
 * @template T The concrete numeric type (F-bounded self-reference).
 */
export abstract class BinaryFpBase<T extends BinaryFpBase<T>>
	extends OrderedBase<T>
	implements INum, IFixedPrecision, IBinaryEncoded
{
	get precisionKind(): "fixed" {
		return "fixed";
	}
	get radix(): 2 {
		return 2;
	}

	/**
	 * Binary floating point is not a field: every operation rounds, so
	 * associativity and distributivity fail.
	 */
	static readonly STRUCTURE: AlgebraicStructure = APPROXIMATE_ORDERED_FIELD;

	/** Total width of the representation, in bits. */
	abstract readonly bitWidth: number;

	// --- INum — format & coercion -------------------------------------------

	abstract override toString(radix?: number): string;
	abstract toFixed(fractionDigits?: number): string;
	abstract toExponential(fractionDigits?: number): string;
	abstract toPrecision(precision: number): string;
	abstract format(
		locales?: Intl.LocalesArgument,
		options?: Intl.NumberFormatOptions,
	): string;
	abstract override valueOf(): number;
	abstract [Symbol.toPrimitive](
		hint: "number" | "string" | "default",
	): number | string | bigint;

	// --- INum — precision queries -------------------------------------------

	abstract get decimalPrecision(): number;
	abstract get integralPrecision(): number;
	abstract get fractionalPrecision(): number;

	// --- IMultiplicative (multiplicative) -------------------------------------------

	abstract mul(other: T): T;
	abstract identity(): T;

	// --- IAdditiveGroup -----------------------------------------------------

	abstract add(other: T): T;
	abstract zero(): T;
	abstract neg(): T;
	abstract sub(other: T): T;

	// --- IField -------------------------------------------------------------

	abstract inv(): T;
	abstract div(other: T): T;

	// --- Real operations ----------------------------------------------------

	abstract abs(): T;
	abstract sign(): Sign;
	abstract sqrt(): T;

	// --- IFixedPrecision ----------------------------------------------------

	abstract get formatInfo(): FixedPrecisionInfo<T>;

	// --- IBinaryEncoded -----------------------------------------------------

	abstract bitAt(position: number): 0 | 1;
}
