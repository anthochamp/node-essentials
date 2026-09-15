import { textPrintTransformer } from "@ac-kit/format-core";
import json5 from "json5";
import type { JsonValue } from "type-fest";

export type Json5PrintStreamOptions = {
	indent?: number | string;
	replacer?: Parameters<typeof JSON.stringify>[1];
	quote?: string;
};

/** Emits each incoming {@link JsonValue} as UTF-8 encoded JSON5. */
export class Json5PrintStream extends TransformStream<JsonValue, Uint8Array> {
	constructor(options: Json5PrintStreamOptions = {}) {
		super(
			textPrintTransformer(
				(value) =>
					json5.stringify(value, {
						replacer: options.replacer,
						space: options.indent,
						quote: options.quote,
					}),
				"JSON5",
			),
		);
	}
}
