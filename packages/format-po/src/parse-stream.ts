import { wholeTextParseTransformer } from "@ac-kit/format-core";

import { parsePo } from "./parse-po.js";
import type { PoEntry } from "./po-entry.js";

/** Buffers a byte stream and emits one parsed PO catalogue on flush. */
export class PoParseStream extends TransformStream<Uint8Array, PoEntry[]> {
	constructor() {
		super(wholeTextParseTransformer(parsePo, "PO"));
	}
}
