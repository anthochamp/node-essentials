import { textPrintTransformer } from "@ac-kit/format-core";

import type { PoEntry } from "./po-entry.js";
import { printPo } from "./print-po.js";

/** Emits each incoming catalogue as a UTF-8 encoded PO document. */
export class PoPrintStream extends TransformStream<
	readonly PoEntry[],
	Uint8Array
> {
	constructor() {
		super(textPrintTransformer(printPo, "PO"));
	}
}
