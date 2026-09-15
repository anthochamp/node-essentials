import { wholeTextParseTransformer } from "@ac-kit/format-core";
import toml from "smol-toml";

export type TomlParseStreamOptions = {
	/** Decode TOML integers as `bigint` rather than `number`. */
	useBigInt?: boolean;
};

/** Buffers a byte stream and emits one parsed TOML document on flush. */
export class TomlParseStream extends TransformStream<
	Uint8Array,
	ReturnType<typeof toml.parse>
> {
	constructor({ useBigInt = false }: TomlParseStreamOptions = {}) {
		super(
			wholeTextParseTransformer(
				(source) => toml.parse(source, { integersAsBigInt: useBigInt }),
				"TOML",
			),
		);
	}
}
