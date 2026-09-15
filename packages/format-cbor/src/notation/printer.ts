import type { DataValue } from "../ast.js";
import type { DiagNode } from "./diag-node.js";

function printFloat(value: number): string {
	if (Number.isNaN(value)) return "NaN";
	if (value === Infinity) return "Infinity";
	if (value === -Infinity) return "-Infinity";
	if (Number.isInteger(value)) {
		// A bare integer literal would parse back as `int`, not `float`
		// (RFC 8949 §2.2, CDDL §2.2.1) — always keep a decimal point.
		return Object.is(value, -0) ? "-0.0" : `${value}.0`;
	}
	return String(value);
}

function printText(value: string): string {
	let out = '"';
	for (const char of value) {
		if (char === '"' || char === "\\") out += `\\${char}`;
		else if (char === "\n") out += "\\n";
		else if (char === "\r") out += "\\r";
		else if (char === "\t") out += "\\t";
		else out += char;
	}
	return `${out}"`;
}

/**
 * Prints a plain {@link DataValue} to diagnostic notation text (no comments —
 * see {@link printDiagNode}).
 */
export function printDataValue(value: DataValue): string {
	switch (value.kind) {
		case "int":
			return value.value.toString();
		case "float":
			return printFloat(value.value);
		case "bytes":
			return `h'${value.value.toHex()}'`;
		case "text":
			return printText(value.value);
		case "array":
			return `[${value.items.map(printDataValue).join(", ")}]`;
		case "map":
			return `{${value.entries
				.map(
					([key, entryValue]) =>
						`${printDataValue(key)}: ${printDataValue(entryValue)}`,
				)
				.join(", ")}}`;
		case "tag":
			return `${value.tag.toString()}(${printDataValue(value.value)})`;
		case "bool":
			return value.value ? "true" : "false";
		case "null":
			return "null";
		case "undefined":
			return "undefined";
		case "simple":
			return `simple(${value.value})`;
	}
}

function printComments(comments: readonly string[]): string {
	return comments.map((comment) => `/${comment}/ `).join("");
}

/**
 * Prints a parsed {@link DiagNode}, preserving its EDN comments (RFC 8610
 * Appendix G.6).
 */
export function printDiagNode(node: DiagNode): string {
	const prefix = printComments(node.leadingComments);
	switch (node.kind) {
		case "int":
			return `${prefix}${node.value.toString()}`;
		case "float":
			return `${prefix}${printFloat(node.value)}`;
		case "bytes":
			return `${prefix}h'${node.value.toHex()}'`;
		case "text":
			return `${prefix}${printText(node.value)}`;
		case "array":
			return `${prefix}[${node.items.map(printDiagNode).join(", ")}]`;
		case "map":
			return `${prefix}{${node.entries
				.map(([key, value]) => `${printDiagNode(key)}: ${printDiagNode(value)}`)
				.join(", ")}}`;
		case "tag":
			return `${prefix}${node.tag.toString()}(${printDiagNode(node.value)})`;
		case "bool":
			return `${prefix}${node.value ? "true" : "false"}`;
		case "null":
			return `${prefix}null`;
		case "undefined":
			return `${prefix}undefined`;
		case "simple":
			return `${prefix}simple(${node.value})`;
	}
}
