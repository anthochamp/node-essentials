/**
 * The base interface shared by every numeric type in this library.
 *
 * ## The contract, and where it sits
 *
 * A numeric type in `math-numbers` is built in three layers, and this interface
 * belongs to the third.
 *
 * 1. **Storage and arithmetic** — plain data plus free functions: {@link Rational}
 *    with `ratAdd`/`ratMul`/…, `IeeeBinaryUnpacked` with `sfAdd`/`sfMul`/…,
 *    `bigint` with `bigIntDivmod`/`bigIntGcd`/…. A function appears at this
 *    layer only when it does real work. There is no `bigIntAdd(a, b)` returning
 *    `a + b`; forwarding to an operator costs a call and earns nothing.
 * 2. **Evidence** — the operations gathered into a record, so a generic algorithm
 *    can take the structure as an argument: `Ring<T>`, `Field<T>`,
 *    `EuclideanDomain<T>` in `@ac-kit/math-algebra`. This is what `gcd` and the
 *    law checks constrain on.
 * 3. **Contract** — the interfaces in this package, and the classes that implement
 *    them. A class here is a worthwhile wrapper over a built-in because it
 *    carries something the built-in cannot: a uniform contract, a declared
 *    {@link AlgebraicStructure}, a precision kind, a radix and a promotion tag.
 *    It carries no arithmetic of its own — every method delegates to layer 1.
 *
 * Which algebraic laws a type obeys is **not** stated here. It is data on the
 * concrete type — `static readonly STRUCTURE` — because TypeScript cannot
 * express associativity, and an interface that claims it enforces nothing.
 * `BinaryFp` and `Fraction` both implement {@link IRealNum}; only one of them
 * is a field, and only the structure says so.
 *
 * ## What this interface requires
 *
 * Conversion to string and number, and value-level decimal-digit precision
 * queries.
 */
export interface INum {
	/**
	 * The canonical numeral for this value, spelled the way the language spells
	 * one — `"NaN"`, `"Infinity"`, `"-Infinity"`, `"0"` for either zero — and in
	 * `radix` when one is given, exactly as `Number.prototype.toString` does.
	 *
	 * Locale-neutral and round-trippable, so this is the form to write to a file
	 * or a wire. {@link format} is the localized counterpart.
	 *
	 * @param radix The base, from 2 to 36. Defaults to 10. A type that cannot
	 *   render a non-decimal radix without a digit budget throws `RangeError`.
	 */
	toString(radix?: number): string;

	/**
	 * Fixed-point notation with exactly `fractionDigits` places, padded with
	 * zeros where the value has fewer — `Number.prototype.toFixed`, without its
	 * cap of 100. A type that can hold more places can show them.
	 */
	toFixed(fractionDigits?: number): string;

	/**
	 * Exponential notation: one digit before the point, `fractionDigits` after,
	 * and an `e±` exponent. Omitting the count shows as many as the value has,
	 * matching `Number.prototype.toExponential`.
	 */
	toExponential(fractionDigits?: number): string;

	/**
	 * `precision` significant digits, switching to exponential notation at the
	 * same thresholds `Number.prototype.toPrecision` does.
	 */
	toPrecision(precision: number): string;

	/**
	 * This value rendered for a human, by `Intl.NumberFormat`.
	 *
	 * The parameters are `new Intl.NumberFormat(locales, options)`'s own,
	 * unchanged — including the default, which is the ambient locale. Ask for
	 * `"en-US"` with `useGrouping: false` when the output has to be
	 * machine-readable.
	 */
	format(
		locales?: Intl.LocalesArgument,
		options?: Intl.NumberFormatOptions,
	): string;

	/**
	 * Returns the nearest IEEE 754 double-precision approximation. May lose
	 * precision for values with more than ~15 significant digits.
	 */
	valueOf(): number;

	/**
	 * Coerces this value to a JS primitive: - `'number'` → same as `valueOf()` -
	 * `'string'` → same as `toString()` - `'default'` → same as `valueOf()`
	 */
	[Symbol.toPrimitive](
		hint: "number" | "string" | "default",
	): number | string | bigint;

	// ---------------------------------------------------------------------------
	// Precision queries (value-level — depend on the specific value, not the type)
	// ---------------------------------------------------------------------------

	/**
	 * Total number of significant decimal digits needed to exactly represent this
	 * value.
	 *
	 * Returns `Number.POSITIVE_INFINITY` for values with non-terminating decimal
	 * expansions (e.g. `Fraction(1, 3)`, `√2`).
	 *
	 * @example
	 * 	```ts
	 * 	Integer.from(12345n).decimalPrecision; // → 5
	 * 	Decimal.from("3.14").decimalPrecision; // → 3
	 * 	Fraction.from(1n, 3n).decimalPrecision; // → Infinity
	 * 	```;
	 */
	readonly decimalPrecision: number;

	/**
	 * Number of decimal digits in the integer (integral) part of `|value|`.
	 * Always at least `1` (the digit `0` for values with `|value| < 1`).
	 *
	 * @example
	 * 	```ts
	 * 	Integer.from(123n).integralPrecision; // → 3
	 * 	Decimal.from("0.5").integralPrecision; // → 1  (the leading '0')
	 * 	Decimal.from("3.14").integralPrecision; // → 1
	 * 	```;
	 */
	readonly integralPrecision: number;

	/**
	 * Number of decimal digits in the fractional part of `|value|`. `0` for exact
	 * integers. Returns `Number.POSITIVE_INFINITY` for non-terminating decimal
	 * expansions.
	 *
	 * @example
	 * 	```ts
	 * 	Integer.from(42n).fractionalPrecision; // → 0
	 * 	Decimal.from("3.14").fractionalPrecision; // → 2
	 * 	Fraction.from(1n, 3n).fractionalPrecision; // → Infinity
	 * 	```;
	 */
	readonly fractionalPrecision: number;
}
