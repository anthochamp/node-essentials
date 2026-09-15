import { concatBytes, decodeText } from "@ac-kit/core";
import * as yaml from "yaml";

export type YamlDocumentsParseStreamOptions = {
	customTags?: yaml.SchemaOptions["customTags"];
	version?: yaml.DocumentOptions["version"];
	schema?: yaml.SchemaOptions["schema"];
};

/**
 * Buffers a byte stream and emits every {@link yaml.Document} it contains on
 * flush.
 */
export class YamlDocumentsParseStream extends TransformStream<
	Uint8Array,
	yaml.Document
> {
	constructor(options: YamlDocumentsParseStreamOptions = {}) {
		const chunks: Uint8Array[] = [];
		super({
			transform(chunk) {
				chunks.push(chunk);
			},
			flush(controller) {
				const source = decodeText(concatBytes(chunks), "utf-8");

				try {
					for (const document of yaml.parseAllDocuments(source, options)) {
						controller.enqueue(document);
					}
				} catch (error) {
					throw new Error("parse YAML documents", { cause: error });
				}
			},
		});
	}
}
