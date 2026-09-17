export * from "./add-tag-directive.js";
export * from "./document-parse-stream.js";
export * from "./document-print-stream.js";
export * from "./documents-parse-stream.js";
export * from "./documents-print-stream.js";
export * from "./edit.js";
export * from "./errors.js";
export * from "./parse-stream.js";
export * from "./parse.js";
export * from "./print-stream.js";
export * from "./print.js";
export * from "./resolve-async-tags.js";

/**
 * The `yaml` node, tag and visitor model, re-exported so a caller can write a
 * custom tag without taking its own dependency on `yaml`.
 *
 * Names are `Yaml`-prefixed rather than kept as upstream. This package's index
 * is a flat `export *`, so a bare `Node`, `Document`, `Scalar` or `Schema`
 * would sit beside `YamlParseStream` and `parseYaml` under names that say
 * nothing about YAML — and `Node` and `Document` are DOM globals, which this
 * package, being portable, is expected to be imported alongside.
 */

export {
	isAlias as isYamlAlias,
	isCollection as isYamlCollection,
	isDocument as isYamlDocument,
	isMap as isYamlMap,
	isNode as isYamlNode,
	isPair as isYamlPair,
	isScalar as isYamlScalar,
	isSeq as isYamlSeq,
	visit as visitYaml,
	visitAsync as visitYamlAsync,
	Alias as YamlAlias,
	Document as YamlDocument,
	YAMLMap as YamlMap,
	Pair as YamlPair,
	Scalar as YamlScalar,
	Schema as YamlSchema,
	YAMLSeq as YamlSeq,
	type asyncVisitor as YamlAsyncVisitor,
	type CollectionTag as YamlCollectionTag,
	type Node as YamlNode,
	type ParsedNode as YamlParsedNode,
	type Range as YamlRange,
	type ScalarTag as YamlScalarTag,
	type TagId as YamlTagId,
	type Tags as YamlTags,
	type visitor as YamlVisitor,
} from "yaml";
export {
	toJS as yamlToJs,
	type CreateNodeContext as YamlCreateNodeContext,
	type StringifyContext as YamlStringifyContext,
	type ToJSContext as YamlToJsContext,
} from "yaml/util";
