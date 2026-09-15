import { diffOfProducts, sumOfProducts } from "@ac-kit/math-scalar";

/**
 * A complex number `re + im·i` over IEEE 754 binary64 components.
 *
 * Represented as a plain tuple so that arrays of complex values stay compact
 * and allocation-free operations can write into a caller-provided buffer.
 */
export type Complex = [re: number, im: number];

export const COMPLEX_ZERO = [0, 0] as const satisfies Complex;
export const COMPLEX_ONE = [1, 0] as const satisfies Complex;

/** The imaginary unit `i`, satisfying `i² = −1`. */
export const COMPLEX_I = [0, 1] as const satisfies Complex;

export function complexAdd(a: Complex, b: Complex): Complex {
	return [a[0] + b[0], a[1] + b[1]];
}

export function complexSub(a: Complex, b: Complex): Complex {
	return [a[0] - b[0], a[1] - b[1]];
}

/** Complex multiplication: `(a + bi)(c + di) = (ac − bd) + (ad + bc)i`. */
export function complexMul(a: Complex, b: Complex): Complex {
	return [
		diffOfProducts(a[0], b[0], a[1], b[1]),
		sumOfProducts(a[0], b[1], a[1], b[0]),
	];
}

/**
 * Complex division, using Smith's algorithm to avoid the intermediate overflow
 * that the naive `(ac + bd) / (c² + d²)` form suffers for large components.
 */
export function complexDiv(a: Complex, b: Complex): Complex {
	if (Math.abs(b[0]) >= Math.abs(b[1])) {
		const ratio = b[1] / b[0];
		const denominator = sumOfProducts(b[0], 1, b[1], ratio);
		return [
			sumOfProducts(a[0], 1, a[1], ratio) / denominator,
			diffOfProducts(a[1], 1, a[0], ratio) / denominator,
		];
	}
	const ratio = b[0] / b[1];
	const denominator = sumOfProducts(b[0], ratio, b[1], 1);
	return [
		sumOfProducts(a[0], ratio, a[1], 1) / denominator,
		diffOfProducts(a[1], ratio, a[0], 1) / denominator,
	];
}

export function complexNeg(a: Complex): Complex {
	return [-a[0], -a[1]];
}

/** The complex conjugate `a − bi`. */
export function complexConjugate(a: Complex): Complex {
	return [a[0], -a[1]];
}

/**
 * Multiplicative inverse `z⁻¹ = conj(z) / |z|²`.
 *
 * @throws When called on zero.
 */
export function complexInverse(a: Complex): Complex {
	const normSq = complexModulusSq(a);
	if (normSq === 0) {
		throw new Error("Cannot invert a zero complex number.");
	}
	const conjugate = complexConjugate(a);
	return [conjugate[0] / normSq, conjugate[1] / normSq];
}

/** The modulus `|z| = √(re² + im²)`. */
export function complexModulus(a: Complex): number {
	return Math.hypot(a[0], a[1]);
}

/** The squared modulus, avoiding the square root when only ordering matters. */
export function complexModulusSq(a: Complex): number {
	return a[0] * a[0] + a[1] * a[1];
}

/** The principal argument `arg(z) ∈ (−π, π]`. */
export function complexArgument(a: Complex): number {
	return Math.atan2(a[1], a[0]);
}

/** Builds a complex number from its polar form `r·e^(iθ)`. */
export function complexFromPolar(modulus: number, argument: number): Complex {
	return [modulus * Math.cos(argument), modulus * Math.sin(argument)];
}

/** Euler's formula: `cis(θ) = cos θ + i·sin θ`, the unit vector at angle θ. */
export function complexCis(argument: number): Complex {
	return [Math.cos(argument), Math.sin(argument)];
}

/** The complex exponential `e^z = e^re · (cos im + i·sin im)`. */
export function complexExp(a: Complex): Complex {
	const magnitude = Math.exp(a[0]);
	return [magnitude * Math.cos(a[1]), magnitude * Math.sin(a[1])];
}

/** The principal complex logarithm `ln|z| + i·arg(z)`. */
export function complexLog(a: Complex): Complex {
	return [Math.log(complexModulus(a)), complexArgument(a)];
}
