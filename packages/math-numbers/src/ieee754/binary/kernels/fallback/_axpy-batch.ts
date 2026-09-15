import { Ieee754BatchAxpyFunction } from "../types.js";
import { axpy } from "./_axpy.js";
import { readElement, writeElement } from "./_batch-element.js";

/** Element-wise `a × x + y`, with `a` decoded once and broadcast over `count`. */
export const axpyBatch: Ieee754BatchAxpyFunction = (
	a,
	x,
	y,
	out,
	count,
	format,
) => {
	const scalar = readElement(a, 0, format);

	for (let index = 0; index < count; index++) {
		writeElement(
			axpy(
				scalar,
				readElement(x, index, format),
				readElement(y, index, format),
				format,
			),
			out,
			index,
			format,
		);
	}
};
