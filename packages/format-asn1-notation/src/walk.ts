import type { AnyAstAssignment } from "./ast/assignment.js";
import type { AstModule } from "./ast/module.js";
import type {
	AnyAstType,
	AstChoiceType,
	AstSequenceType,
	AstTaggedType,
	AstTypeReference,
} from "./ast/type.js";
import type {
	CstTypeAssignment,
	CstValueAssignment,
} from "./cst/assignment.js";
import type {
	CstChoiceType,
	CstSequenceOfType,
	CstSequenceType,
	CstSetOfType,
	CstSetType,
} from "./cst/constructed.js";
import type { CstModuleDefinition } from "./cst/module.js";
import type {
	CstAnyType,
	CstConstrainedType,
	CstTaggedType,
} from "./cst/type.js";

export type WalkControl = "continue" | "skipChildren" | "stop";

export interface AstTypeVisitor {
	onType?(node: AnyAstType): WalkControl | void;
	onAssignment?(node: AnyAstAssignment): WalkControl | void;
}

/** Walk all types in a module in pre-order. Returns true if stopped early. */
export function walkAst(module: AstModule, visitor: AstTypeVisitor): boolean {
	for (const assignment of module.assignments) {
		const ctrl = visitor.onAssignment?.(assignment) ?? "continue";
		if (ctrl === "stop") return true;
		if (ctrl === "skipChildren") continue;
		if (assignment.kind === "typeAssignment") {
			if (walkType(assignment.type, visitor)) return true;
		} else {
			if (walkType(assignment.type, visitor)) return true;
		}
	}
	return false;
}

function walkType(node: AnyAstType, visitor: AstTypeVisitor): boolean {
	const ctrl = visitor.onType?.(node) ?? "continue";
	if (ctrl === "stop") return true;
	if (ctrl === "skipChildren") return false;
	return walkTypeChildren(node, visitor);
}

function walkTypeChildren(node: AnyAstType, visitor: AstTypeVisitor): boolean {
	switch (node.kind) {
		case "sequence":
		case "set":
			for (const comp of node.components) {
				if (comp.kind === "component") {
					if (walkType(comp.type, visitor)) return true;
				} else if (comp.kind === "extensionAdditionGroup") {
					for (const c of comp.components) {
						if (walkType(c.type, visitor)) return true;
					}
				}
			}
			return false;
		case "choice":
			for (const alt of node.alternatives) {
				if (alt.kind === "alternative") {
					if (walkType(alt.type, visitor)) return true;
				}
			}
			return false;
		case "sequenceOf":
		case "setOf":
			return walkType(node.elementType, visitor);
		case "tagged":
			return walkType(node.innerType, visitor);
		case "constrained":
			return walkType(node.baseType, visitor);
		default:
			return false;
	}
}

// ── Type guards ───────────────────────────────────────────────────────────────

export function isAstTypeReference(node: AnyAstType): node is AstTypeReference {
	return node.kind === "typeReference";
}
export function isAstSequenceType(node: AnyAstType): node is AstSequenceType {
	return node.kind === "sequence";
}
export function isAstTaggedType(node: AnyAstType): node is AstTaggedType {
	return node.kind === "tagged";
}
export function isAstChoiceType(node: AnyAstType): node is AstChoiceType {
	return node.kind === "choice";
}

// ── walkCst ───────────────────────────────────────────────────────────────────

export interface CstVisitor {
	onModule?(node: CstModuleDefinition): WalkControl | void;
	onTypeAssignment?(node: CstTypeAssignment): WalkControl | void;
	onValueAssignment?(node: CstValueAssignment): WalkControl | void;
	/** Called for every type node encountered while walking assignments. */
	onType?(node: CstAnyType): WalkControl | void;
}

/** Walk a CST module in pre-order, calling visitor callbacks for each node. */
export function walkCst(
	module: CstModuleDefinition,
	visitor: CstVisitor,
): void {
	const ctrl = visitor.onModule?.(module) ?? "continue";
	if (ctrl === "stop" || ctrl === "skipChildren") return;

	for (const assignment of module.body.assignments) {
		if (assignment.kind === "typeAssignment") {
			const assignCtrl = visitor.onTypeAssignment?.(assignment) ?? "continue";
			if (assignCtrl === "stop") return;
			if (assignCtrl !== "skipChildren") {
				if (visitor.onType) walkCstType(assignment.type, visitor);
			}
		} else {
			const assignCtrl = visitor.onValueAssignment?.(assignment) ?? "continue";
			if (assignCtrl === "stop") return;
			if (assignCtrl !== "skipChildren" && visitor.onType) {
				walkCstType(assignment.type, visitor);
			}
		}
	}
}

function walkCstType(node: CstAnyType, visitor: CstVisitor): boolean {
	const ctrl = visitor.onType?.(node) ?? "continue";
	if (ctrl === "stop") return true;
	if (ctrl === "skipChildren") return false;
	return walkCstTypeChildren(node, visitor);
}

function walkCstTypeChildren(node: CstAnyType, visitor: CstVisitor): boolean {
	switch (node.kind) {
		case "sequence":
		case "set": {
			for (const comp of (node as CstSequenceType | CstSetType).components) {
				if (comp.kind === "component" && walkCstType(comp.type, visitor))
					return true;
				if (comp.kind === "extensionAdditionGroup") {
					for (const c of comp.components) {
						if (walkCstType(c.type, visitor)) return true;
					}
				}
			}
			return false;
		}
		case "sequenceOf":
		case "setOf":
			return walkCstType(
				(node as CstSequenceOfType | CstSetOfType).elementType,
				visitor,
			);
		case "choice": {
			for (const alt of (node as CstChoiceType).alternatives) {
				if (alt.kind === "alternative" && walkCstType(alt.type, visitor))
					return true;
			}
			return false;
		}
		case "taggedType":
			return walkCstType((node as CstTaggedType).innerType, visitor);
		case "constrainedType":
			return walkCstType((node as CstConstrainedType).baseType, visitor);
		default:
			return false;
	}
}
