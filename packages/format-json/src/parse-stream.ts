import { wholeTextParseTransformer } from "@ac-kit/format-core";
import type { JsonValue } from "type-fest";

/** Buffers a byte stream and emits one parsed {@link JsonValue} on flush. */
export class JsonParseStream extends TransformStream<Uint8Array, JsonValue> {
	constructor() {
		super(
			wholeTextParseTransformer(
				(source) => JSON.parse(source) as JsonValue,
				"JSON",
			),
		);
	}
}
