import type { IField } from "@ac-kit/math-algebra";

import {
	COMPLEX_I,
	COMPLEX_ONE,
	COMPLEX_ZERO,
	Complex,
	complexAdd,
	complexArgument,
	complexConjugate,
	complexDiv,
	complexInverse,
	complexModulus,
	complexMul,
	complexNeg,
	complexSub,
} from "./complex.js";

/**
 * A complex number `re + im·i`, boxed as a value with its own field API.
 *
 * The contract shell over {@link Complex}. Every operation delegates to the
 * free functions in `complex.ts`; no arithmetic happens in this class.
 *
 * ```ts
 * const z = ComplexNum.from(3, 4);
 * z.abs(); // 5
 * z.mul(ComplexNum.I).re; // -4
 * ```
 */
export class ComplexNum implements IField<ComplexNum> {
	readonly #value: Complex;

	private constructor(value: Complex) {
		this.#value = value;
	}

	/** The complex number `0 + 0i`. */
	static readonly ZERO: ComplexNum = new ComplexNum(COMPLEX_ZERO);

	/** The complex number `1 + 0i`. */
	static readonly ONE: ComplexNum = new ComplexNum(COMPLEX_ONE);

	/** The imaginary unit `i`, satisfying `i² = −1`. */
	static readonly I: ComplexNum = new ComplexNum(COMPLEX_I);

	/** Creates a complex number from its real and imaginary parts. */
	static from(re: number, im = 0): ComplexNum {
		return new ComplexNum([re, im]);
	}

	/** Wraps an already-computed {@link Complex} tuple. */
	static fromTuple(value: Complex): ComplexNum {
		return new ComplexNum(value);
	}

	/** The underlying tuple, for callers working at the arithmetic layer. */
	toTuple(): Complex {
		return this.#value;
	}

	/** Real part `a` of `a + bi`. */
	get re(): number {
		return this.#value[0];
	}

	/** Imaginary part `b` of `a + bi`. */
	get im(): number {
		return this.#value[1];
	}

	/** Modulus `|z| = √(re² + im²)`. Always non-negative. */
	abs(): number {
		return complexModulus(this.#value);
	}

	/** Argument `arg(z) = atan2(im, re) ∈ (−π, π]`. */
	arg(): number {
		return complexArgument(this.#value);
	}

	/** `conj(a + bi) = a − bi`. */
	conj(): ComplexNum {
		return new ComplexNum(complexConjugate(this.#value));
	}

	add(other: ComplexNum): ComplexNum {
		return new ComplexNum(complexAdd(this.#value, other.#value));
	}

	sub(other: ComplexNum): ComplexNum {
		return new ComplexNum(complexSub(this.#value, other.#value));
	}

	neg(): ComplexNum {
		return new ComplexNum(complexNeg(this.#value));
	}

	mul(other: ComplexNum): ComplexNum {
		return new ComplexNum(complexMul(this.#value, other.#value));
	}

	/** @throws When called on zero. */
	inv(): ComplexNum {
		return new ComplexNum(complexInverse(this.#value));
	}

	/** @throws When `other` is zero. */
	div(other: ComplexNum): ComplexNum {
		return new ComplexNum(complexDiv(this.#value, other.#value));
	}
}
