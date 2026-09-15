import * as yaml from "yaml";

export type YamlPrintOptions = yaml.DocumentOptions &
	yaml.SchemaOptions &
	yaml.CreateNodeOptions &
	yaml.ToStringOptions;

/** Serializes a value to a YAML string. */
export function printYaml(value: unknown, options?: YamlPrintOptions): string {
	try {
		return yaml.stringify(value, options);
	} catch (error) {
		throw new Error("print YAML", { cause: error });
	}
}

/** Serializes a {@link yaml.Document} to a YAML string. */
export function printYamlDocument(
	doc: yaml.Document,
	options?: yaml.ToStringOptions,
): string {
	return doc.toString(options);
}
