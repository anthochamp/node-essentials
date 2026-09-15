import { wholeTextParseTransformer } from "@ac-kit/format-core";
import * as yaml from "yaml";

export type YamlDocumentParseStreamOptions = {
	parseOptions?: yaml.ParseOptions;
	documentOptions?: yaml.DocumentOptions;
	schemaOptions?: yaml.SchemaOptions;
};

/** Buffers a byte stream and emits one {@link yaml.Document} on flush. */
export class YamlDocumentParseStream extends TransformStream<
	Uint8Array,
	yaml.Document
> {
	constructor(options: YamlDocumentParseStreamOptions = {}) {
		super(
			wholeTextParseTransformer(
				(source) =>
					yaml.parseDocument(source, {
						...options.parseOptions,
						...options.documentOptions,
						...options.schemaOptions,
					}),
				"YAML document",
			),
		);
	}
}
