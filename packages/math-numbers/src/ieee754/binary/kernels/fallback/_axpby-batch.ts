import { Ieee754BatchAxpbyFunction } from "../types.js";
import { axpby } from "./_axpby.js";
import { readElement, writeElement } from "./_batch-element.js";

/** Element-wise `a × x + b × y`, with `a` and `b` decoded once and broadcast. */
export const axpbyBatch: Ieee754BatchAxpbyFunction = (
	a,
	x,
	b,
	y,
	out,
	count,
	format,
) => {
	const scalarA = readElement(a, 0, format);
	const scalarB = readElement(b, 0, format);

	for (let index = 0; index < count; index++) {
		writeElement(
			axpby(
				scalarA,
				readElement(x, index, format),
				scalarB,
				readElement(y, index, format),
				format,
			),
			out,
			index,
			format,
		);
	}
};
