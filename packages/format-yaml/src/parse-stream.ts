import { wholeTextParseTransformer } from "@ac-kit/format-core";
import type * as yaml from "yaml";

import { parseYaml } from "./parse.js";

export type YamlParseStreamOptions = yaml.ParseOptions &
	yaml.DocumentOptions &
	yaml.SchemaOptions;

/** Buffers a byte stream and emits one parsed YAML value on flush. */
export class YamlParseStream extends TransformStream<Uint8Array, unknown> {
	constructor(options: YamlParseStreamOptions = {}) {
		super(
			wholeTextParseTransformer((source) => parseYaml(source, options), "YAML"),
		);
	}
}
