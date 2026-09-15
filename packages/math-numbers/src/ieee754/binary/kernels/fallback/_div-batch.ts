import { Ieee754BatchBinaryFunction } from "../types.js";
import { readElement, writeElement } from "./_batch-element.js";
import { div } from "./_div.js";

/** Element-wise `a / b`, packing and unpacking each element in turn. */
export const divBatch: Ieee754BatchBinaryFunction = (
	a,
	b,
	out,
	count,
	format,
) => {
	for (let index = 0; index < count; index++) {
		writeElement(
			div(readElement(a, index, format), readElement(b, index, format), format),
			out,
			index,
			format,
		);
	}
};
