import { dotPrecise, TWO_PI } from "@ac-kit/math-scalar";

/**
 * Generates a window of `length` samples from a generalised cosine window with
 * the given coefficients:
 *
 * ```text
 * w[n] = Σ (−1)^k · aₖ · cos(2πkn / (N − 1))
 * ```
 */
function cosineWindow(
	length: number,
	coefficients: readonly number[],
): Float64Array {
	if (!Number.isInteger(length) || length < 1) {
		throw new RangeError(
			`window length must be a positive integer, got ${length}`,
		);
	}

	const window = new Float64Array(length);
	if (length === 1) {
		window[0] = 1;
		return window;
	}

	const denominator = length - 1;
	// The terms alternate in sign and very nearly cancel at the window edges, so
	// the sum is compensated; both buffers are reused across every sample.
	const signed = Float64Array.from(coefficients, (value, k) =>
		k % 2 === 0 ? value : -value,
	);
	const cosines = new Float64Array(coefficients.length);

	for (let n = 0; n < length; n++) {
		for (let k = 0; k < cosines.length; k++) {
			cosines[k] = Math.cos((TWO_PI * k * n) / denominator);
		}
		window[n] = dotPrecise(signed, cosines);
	}
	return window;
}

/**
 * Hann window — a raised cosine with −31 dB first sidelobe and 18 dB/octave
 * rolloff. The default choice for general-purpose spectral analysis.
 */
export function hannWindow(length: number): Float64Array {
	return cosineWindow(length, [0.5, 0.5]);
}

/**
 * Hamming window — the raised cosine whose coefficients minimise the first
 * sidelobe (−43 dB), at the cost of a slower 6 dB/octave rolloff than Hann.
 */
export function hammingWindow(length: number): Float64Array {
	return cosineWindow(length, [0.54, 0.46]);
}

/**
 * Blackman window — a three-term cosine window with −58 dB sidelobes and a
 * wider main lobe, used when dynamic range matters more than frequency
 * resolution.
 */
export function blackmanWindow(length: number): Float64Array {
	return cosineWindow(length, [0.42, 0.5, 0.08]);
}
