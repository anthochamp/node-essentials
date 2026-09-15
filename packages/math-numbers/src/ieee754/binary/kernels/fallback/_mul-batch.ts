import { Ieee754BatchBinaryFunction } from "../types.js";
import { readElement, writeElement } from "./_batch-element.js";
import { mul } from "./_mul.js";

/**
 * Element-wise `a × b`, packing and unpacking each element in turn — the
 * portable batch, and the baseline a native one has to beat.
 */
export const mulBatch: Ieee754BatchBinaryFunction = (
	a,
	b,
	out,
	count,
	format,
) => {
	for (let index = 0; index < count; index++) {
		writeElement(
			mul(readElement(a, index, format), readElement(b, index, format), format),
			out,
			index,
			format,
		);
	}
};
