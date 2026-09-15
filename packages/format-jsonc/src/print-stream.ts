import { textPrintTransformer } from "@ac-kit/format-core";
import type { JsonValue } from "type-fest";

export type JsoncPrintStreamOptions = {
	indent?: number | string;
	replacer?: Parameters<typeof JSON.stringify>[1];
};

/** Emits each incoming {@link JsonValue} as UTF-8 encoded JSONC. */
export class JsoncPrintStream extends TransformStream<JsonValue, Uint8Array> {
	constructor(options: JsoncPrintStreamOptions = {}) {
		// biome-ignore lint/suspicious/noExplicitAny: JSON.stringify overload resolution fails in TS7 when the replacer type is widened
		const stringify = JSON.stringify as (
			v: unknown,
			r?: any,
			s?: string | number,
		) => string;
		super(
			textPrintTransformer(
				(value) => stringify(value, options.replacer, options.indent),
				"JSONC",
			),
		);
	}
}
