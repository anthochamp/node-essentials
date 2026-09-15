import type { DataValue } from "../ast.js";
import type { DiagNode } from "./diag-node.js";

/**
 * Lowers a parsed {@link DiagNode} to a plain {@link DataValue}, dropping spans
 * and comments.
 */
export function diagToValue(node: DiagNode): DataValue {
	switch (node.kind) {
		case "array":
			return { kind: "array", items: node.items.map(diagToValue) };
		case "map":
			return {
				kind: "map",
				entries: node.entries.map(([key, value]) => [
					diagToValue(key),
					diagToValue(value),
				]),
			};
		case "tag":
			return { kind: "tag", tag: node.tag, value: diagToValue(node.value) };
		case "int":
			return { kind: "int", value: node.value };
		case "float":
			return { kind: "float", value: node.value };
		case "bytes":
			return { kind: "bytes", value: node.value };
		case "text":
			return { kind: "text", value: node.value };
		case "bool":
			return { kind: "bool", value: node.value };
		case "null":
			return { kind: "null" };
		case "undefined":
			return { kind: "undefined" };
		case "simple":
			return { kind: "simple", value: node.value };
	}
}
