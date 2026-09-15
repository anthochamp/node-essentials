import { textPrintTransformer } from "@ac-kit/format-core";
import toml from "smol-toml";

type TomlStringifyOptions = NonNullable<Parameters<typeof toml.stringify>[1]>;

/** Emits each incoming value as a UTF-8 encoded TOML document. */
export class TomlPrintStream extends TransformStream<unknown, Uint8Array> {
	constructor(options: TomlStringifyOptions = {}) {
		super(
			textPrintTransformer((value) => toml.stringify(value, options), "TOML"),
		);
	}
}
