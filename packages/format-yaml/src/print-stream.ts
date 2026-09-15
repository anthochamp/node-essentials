import { textPrintTransformer } from "@ac-kit/format-core";
import * as yaml from "yaml";

export type YamlPrintStreamOptions = yaml.DocumentOptions &
	yaml.SchemaOptions &
	yaml.ParseOptions &
	yaml.CreateNodeOptions &
	yaml.ToStringOptions;

/** Emits each incoming value as a UTF-8 encoded YAML document. */
export class YamlPrintStream extends TransformStream<unknown, Uint8Array> {
	constructor(options: YamlPrintStreamOptions = {}) {
		super(
			textPrintTransformer((value) => yaml.stringify(value, options), "YAML"),
		);
	}
}
