import { AnyAsn1TypeDef } from "./types/any-def.js";

// ── Control tokens ─────────────────────────────────────────────────────────────

/** Continue descending into children (default). */
export type WalkContinue = "continue";
/** Skip descending into the current node's children. */
export type WalkSkipChildren = "skipChildren";
/** Stop the entire walk immediately. */
export type WalkStop = "stop";
/** Control value returned from a visitor callback. */
export type WalkControl = WalkContinue | WalkSkipChildren | WalkStop;

/** Sentinel values for each control token. */
export const WalkContinue: WalkContinue = "continue";
export const WalkSkipChildren: WalkSkipChildren = "skipChildren";
export const WalkStop: WalkStop = "stop";

// ── Visitor ────────────────────────────────────────────────────────────────────

/**
 * Visitor callback passed to `walkDef`.
 *
 * @param def - The current node.
 * @param path - Dot-separated path from the root to this node.
 * @returns Control token; `undefined` is treated as `"continue"`.
 */
export type WalkDefVisitor = (
	def: AnyAsn1TypeDef,
	path: string,
) => WalkControl | undefined | void;

// ── walkDef ───────────────────────────────────────────────────────────────────

/**
 * Walk a `AnyAsn1TypeDef` tree in pre-order.
 *
 * - `Asn1LazyTypeDef`: calls `getter()` and descends into the resolved schema.
 * - `ComponentsOfRef`: treated as a reference, not descended into.
 * - Returns `true` if the walk was stopped early (`WalkStop`).
 */
export function walkDef(
	def: AnyAsn1TypeDef,
	visitor: WalkDefVisitor,
	path = "",
): boolean {
	const control = visitor(def, path) ?? WalkContinue;
	if (control === WalkStop) return true;
	if (control === WalkSkipChildren) return false;

	return walkChildren(def, visitor, path);
}

function walkChildren(
	def: AnyAsn1TypeDef,
	visitor: WalkDefVisitor,
	path: string,
): boolean {
	switch (def.kind) {
		case "sequence":
		case "set": {
			for (let i = 0; i < def.components.length; i++) {
				const comp = def.components[i]!;
				if (comp.kind === "component") {
					const childPath = `${path ? `${path}.` : ""}components[${i}]:${comp.name}`;
					if (walkDef(comp.type, visitor, childPath)) return true;
				} else if (comp.kind === "extensionAdditionGroup") {
					for (let j = 0; j < comp.components.length; j++) {
						const inner = comp.components[j]!;
						const childPath = `${path ? `${path}.` : ""}components[${i}].components[${j}]:${inner.name}`;
						if (walkDef(inner.type, visitor, childPath)) return true;
					}
				}
				// extensionMarker and componentsOf are not descended
			}
			break;
		}
		case "choice": {
			for (let i = 0; i < def.alternatives.length; i++) {
				const alt = def.alternatives[i]!;
				if ("name" in alt) {
					const childPath = `${path ? `${path}.` : ""}alternatives[${i}]:${alt.name}`;
					if (walkDef(alt.type, visitor, childPath)) return true;
				}
			}
			break;
		}
		case "sequenceOf":
		case "setOf": {
			const childPath = `${path ? `${path}.` : ""}elementType`;
			if (walkDef(def.elementType, visitor, childPath)) return true;
			break;
		}
		case "tagged": {
			const childPath = `${path ? `${path}.` : ""}innerType`;
			if (walkDef(def.innerType, visitor, childPath)) return true;
			break;
		}
		case "transform": {
			const childPath = `${path ? `${path}.` : ""}innerType`;
			if (walkDef(def.innerType, visitor, childPath)) return true;
			break;
		}
		case "lazy": {
			const resolved = def.getter();
			const childPath = `${path ? `${path}.` : ""}lazy`;
			if (walkDef(resolved, visitor, childPath)) return true;
			break;
		}
		default:
			break;
	}
	return false;
}
