import * as yaml from "yaml";
import { warn } from "yaml/util";

import { YamlParseError } from "./errors.js";

export type YamlParseOptions = yaml.ParseOptions &
	yaml.DocumentOptions &
	yaml.SchemaOptions &
	yaml.ToJSOptions;

/**
 * Alias expansions allowed while converting a document to a plain value, unless
 * the caller passes its own `maxAliasCount`.
 *
 * An anchor referenced from inside another anchor expands multiplicatively —
 * the "billion laughs" denial of service — and this bound is the only thing
 * between untrusted YAML and an unbounded allocation. `-1` disables the check,
 * `0` rejects every alias.
 */
export const DEFAULT_YAML_MAX_ALIAS_COUNT = 100;

/**
 * Parses a YAML string into a plain JS value.
 *
 * Throws {@link YamlParseError} for malformed input, carrying every diagnostic
 * with its position. Alias expansion is bounded by
 * {@link DEFAULT_YAML_MAX_ALIAS_COUNT}.
 */
export function parseYaml(source: string, options?: YamlParseOptions): unknown {
	const logLevel = options?.logLevel ?? "warn";
	const document = yaml.parseDocument(source, options);

	for (const warning of document.warnings) {
		warn(logLevel, warning);
	}
	if (document.errors.length > 0 && logLevel !== "silent") {
		throw new YamlParseError(document.errors);
	}

	try {
		return document.toJS({
			maxAliasCount: DEFAULT_YAML_MAX_ALIAS_COUNT,
			...options,
		});
	} catch (error) {
		throw new Error("parse YAML", { cause: error });
	}
}

/**
 * Parses a YAML string into a {@link yaml.Document} (CST-level).
 *
 * Error-tolerant, as `yaml`'s own `parseDocument` is: diagnostics stay on the
 * returned document's `errors`, so partially valid source is still inspectable.
 * Hand them to {@link YamlParseError} to turn them into a throw. `maxAliasCount`
 * bounds `toJS()`, not this call.
 */
export function parseYamlDocument(
	source: string,
	options?: yaml.ParseOptions & yaml.DocumentOptions & yaml.SchemaOptions,
): yaml.Document {
	return yaml.parseDocument(source, options);
}

/**
 * Parses all YAML documents from a multi-document string.
 *
 * Error-tolerant in the same way as {@link parseYamlDocument}.
 */
export function parseAllYamlDocuments(
	source: string,
	options?: yaml.ParseOptions & yaml.DocumentOptions & yaml.SchemaOptions,
): yaml.Document[] {
	return yaml.parseAllDocuments(source, options);
}
