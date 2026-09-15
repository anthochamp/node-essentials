import type { IRing } from "@ac-kit/math-algebra";

import {
	QUATERNION_IDENTITY,
	Quaternion,
	quaternionAdd,
	quaternionConjugate,
	quaternionInverse,
	quaternionLength,
	quaternionMultiply,
	quaternionNeg,
	quaternionSub,
} from "./quaternion.js";

/**
 * A quaternion `a + bi + cj + dk`, boxed as a value with its own ring API.
 *
 * The contract shell over {@link Quaternion}. Every operation delegates to the
 * free functions in `quaternion.ts`; no arithmetic happens in this class. The
 * underlying tuple stores components as `[b, c, d, a]` — vector, then scalar;
 * {@link scalar} and {@link vector} present the `a + bi + cj + dk` reading.
 */
export class QuaternionNum implements IRing<QuaternionNum> {
	readonly #value: Quaternion;

	private constructor(value: Quaternion) {
		this.#value = value;
	}

	/** The quaternion `1 + 0i + 0j + 0k`. */
	static readonly IDENTITY: QuaternionNum = new QuaternionNum(
		QUATERNION_IDENTITY,
	);

	/** Creates a quaternion from its scalar part and its `i, j, k` vector part. */
	static from(
		scalar: number,
		vector: readonly [number, number, number],
	): QuaternionNum {
		return new QuaternionNum([vector[0], vector[1], vector[2], scalar]);
	}

	/** Wraps an already-computed {@link Quaternion} tuple `[b, c, d, a]`. */
	static fromTuple(value: Quaternion): QuaternionNum {
		return new QuaternionNum(value);
	}

	/**
	 * The underlying `[b, c, d, a]` tuple, for callers working at the arithmetic
	 * layer.
	 */
	toTuple(): Quaternion {
		return this.#value;
	}

	/** Scalar (real) part: the `a` in `a + bi + cj + dk`. */
	get scalar(): number {
		return this.#value[3];
	}

	/** Vector (pure-quaternion) part: `[b, c, d]` for `i`, `j`, `k` components. */
	get vector(): readonly [number, number, number] {
		return [this.#value[0], this.#value[1], this.#value[2]];
	}

	/**
	 * Conjugate `conj(a + bi + cj + dk) = a − bi − cj − dk`. Negates the vector
	 * part; leaves the scalar part unchanged.
	 */
	conj(): QuaternionNum {
		return new QuaternionNum(quaternionConjugate(this.#value));
	}

	/** Norm `‖q‖ = √(a² + b² + c² + d²)`. Always non-negative. */
	norm(): number {
		return quaternionLength(this.#value);
	}

	/**
	 * Multiplicative inverse `q⁻¹ = conj(q) / ‖q‖²`.
	 *
	 * @throws When called on the zero quaternion.
	 */
	inv(): QuaternionNum {
		return new QuaternionNum(quaternionInverse(this.#value));
	}

	add(other: QuaternionNum): QuaternionNum {
		return new QuaternionNum(quaternionAdd(this.#value, other.#value));
	}

	sub(other: QuaternionNum): QuaternionNum {
		return new QuaternionNum(quaternionSub(this.#value, other.#value));
	}

	neg(): QuaternionNum {
		return new QuaternionNum(quaternionNeg(this.#value));
	}

	/** Hamilton product `this · other` — non-commutative. */
	mul(other: QuaternionNum): QuaternionNum {
		return new QuaternionNum(quaternionMultiply(this.#value, other.#value));
	}
}
