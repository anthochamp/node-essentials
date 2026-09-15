import { wholeTextParseTransformer } from "@ac-kit/format-core";
import jsonc, { type ParseOptions } from "jsonc-parser";
import type { JsonValue } from "type-fest";

import { JsoncParseError } from "./error.js";

/** Buffers a byte stream and emits one parsed JSONC value on flush. */
export class JsoncParseStream extends TransformStream<Uint8Array, JsonValue> {
	constructor(options: ParseOptions = {}) {
		const parseOptions: ParseOptions = { allowTrailingComma: true, ...options };
		super(
			wholeTextParseTransformer((source) => {
				const errors: jsonc.ParseError[] = [];
				const result = jsonc.parse(source, errors, parseOptions) as JsonValue;
				if (errors.length > 0) {
					throw new JsoncParseError(errors[0]!);
				}
				return result;
			}, "JSONC"),
		);
	}
}
