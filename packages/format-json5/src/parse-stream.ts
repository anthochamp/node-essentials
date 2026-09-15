import { wholeTextParseTransformer } from "@ac-kit/format-core";
import json5 from "json5";
import type { JsonValue } from "type-fest";

/** Buffers a byte stream and emits one parsed JSON5 value on flush. */
export class Json5ParseStream extends TransformStream<Uint8Array, JsonValue> {
	constructor() {
		super(
			wholeTextParseTransformer(
				(source) => json5.parse<JsonValue>(source),
				"JSON5",
			),
		);
	}
}
