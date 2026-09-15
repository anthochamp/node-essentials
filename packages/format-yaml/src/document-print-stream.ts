import { textPrintTransformer } from "@ac-kit/format-core";
import * as yaml from "yaml";

/** Emits each incoming {@link yaml.Document} as UTF-8 encoded YAML. */
export class YamlDocumentPrintStream extends TransformStream<
	yaml.Document,
	Uint8Array
> {
	constructor(options: yaml.ToStringOptions = {}) {
		super(
			textPrintTransformer(
				(document) => document.toString(options),
				"YAML document",
			),
		);
	}
}
