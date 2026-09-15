import * as yaml from "yaml";

export type YamlParseOptions = yaml.ParseOptions &
	yaml.DocumentOptions &
	yaml.SchemaOptions &
	yaml.ToJSOptions;

/** Parses a YAML string into a plain JS value. */
export function parseYaml(source: string, options?: YamlParseOptions): unknown {
	try {
		return yaml.parse(source, options);
	} catch (error) {
		throw new Error("parse YAML", { cause: error });
	}
}

/** Parses a YAML string into a {@link yaml.Document} (CST-level). */
export function parseYamlDocument(
	source: string,
	options?: yaml.ParseOptions & yaml.DocumentOptions & yaml.SchemaOptions,
): yaml.Document {
	return yaml.parseDocument(source, options);
}

/** Parses all YAML documents from a multi-document string. */
export function parseAllYamlDocuments(
	source: string,
	options?: yaml.ParseOptions & yaml.DocumentOptions & yaml.SchemaOptions,
): yaml.Document[] {
	return yaml.parseAllDocuments(source, options);
}
