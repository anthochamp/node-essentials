import type { AnyConstraintDef } from "./constraints/common.js";
import type { SizeConstraintDef } from "./constraints/size.js";
import type { ValueRangeConstraintDef } from "./constraints/value-range.js";
import { AnyAsn1TypeDef } from "./types/any-def.js";
import { walkDef } from "./walk.js";

// ── Validation result types ────────────────────────────────────────────────────

/** A single structural violation found by `validateSchema`. */
export interface SchemaValidationError {
	readonly path: string;
	readonly message: string;
}

/** Result of `validateSchema`. */
export interface ValidationResult {
	readonly valid: boolean;
	readonly errors: readonly SchemaValidationError[];
}

// ── Constraint check types ────────────────────────────────────────────────────

/** A single constraint violation. */
export interface ConstraintViolation {
	readonly constraint: AnyConstraintDef;
	readonly message: string;
}

/** Result of `checkValueConstraint`. */
export interface ConstraintCheckResult {
	readonly ok: boolean;
	readonly violations: readonly ConstraintViolation[];
}

// ── validateSchema ────────────────────────────────────────────────────────────

/**
 * Perform structural validation on a schema def tree.
 *
 * Checks: - Range / size constraints: min ≤ max. - Unique component names in
 * SEQUENCE and SET. - `paramRef` / `paramValueRef` are only valid inside a
 * parameterized type body (detected as top-level uses that have no template
 * ancestor).
 *
 * Never throws — returns all violations as a list.
 */
export function validateSchema(def: AnyAsn1TypeDef): ValidationResult {
	const errors: SchemaValidationError[] = [];

	walkDef(def, (node, path) => {
		if (node.kind === "sequence" || node.kind === "set") {
			const names = new Set<string>();
			for (const comp of node.components) {
				if (comp.kind === "component") {
					if (names.has(comp.name)) {
						errors.push({
							path,
							message: `Duplicate component name: "${comp.name}"`,
						});
					}
					names.add(comp.name);
				}
			}
		}

		if (
			node.kind === "integer" ||
			node.kind === "real" ||
			node.kind === "octetString" ||
			node.kind === "bitString" ||
			node.kind === "utf8String" ||
			node.kind === "numericString" ||
			node.kind === "printableString" ||
			node.kind === "ia5String" ||
			node.kind === "visibleString" ||
			node.kind === "generalString" ||
			node.kind === "universalString" ||
			node.kind === "bmpString" ||
			node.kind === "teletexString" ||
			node.kind === "videotexString" ||
			node.kind === "graphicString" ||
			node.kind === "sequenceOf" ||
			node.kind === "setOf"
		) {
			const constraints =
				(node as { constraints?: readonly AnyConstraintDef[] }).constraints ??
				[];
			for (const c of constraints) {
				checkRangeBounds(c, path, errors);
			}
		}

		if (node.kind === "paramRef" || node.kind === "paramValueRef") {
			errors.push({
				path,
				message: `"${node.kind}" can only appear inside a parameterized type body`,
			});
		}
	});

	return { valid: errors.length === 0, errors };
}

function checkRangeBounds(
	c: AnyConstraintDef,
	path: string,
	errors: SchemaValidationError[],
): void {
	if (c.kind === "valueRange" || c.kind === "size") {
		const { min, max } = c as ValueRangeConstraintDef | SizeConstraintDef;
		if (typeof min === "bigint" && typeof max === "bigint" && min > max) {
			errors.push({
				path,
				message: `Constraint ${c.kind}: min (${min}) > max (${max})`,
			});
		}
		if (typeof min === "number" && typeof max === "number" && min > max) {
			errors.push({
				path,
				message: `Constraint ${c.kind}: min (${min}) > max (${max})`,
			});
		}
	}
	if (c.kind === "union" || c.kind === "intersection") {
		for (const operand of c.operands) {
			checkRangeBounds(operand, path, errors);
		}
	}
	if (c.kind === "extensibleConstraint") {
		checkRangeBounds(c.constraint, path, errors);
	}
}

// ── checkValueConstraint ──────────────────────────────────────────────────────

/**
 * Check a runtime value against the declared constraints of a def.
 *
 * Returns all violations; never throws. This is encoding-format independent.
 */
export function checkValueConstraint(
	def: AnyAsn1TypeDef,
	value: unknown,
): ConstraintCheckResult {
	const violations: ConstraintViolation[] = [];
	const constraints =
		(def as { constraints?: readonly AnyConstraintDef[] }).constraints ?? [];
	for (const c of constraints) {
		checkOneConstraint(c, value, violations);
	}
	return { ok: violations.length === 0, violations };
}

function checkOneConstraint(
	c: AnyConstraintDef,
	value: unknown,
	violations: ConstraintViolation[],
): void {
	if (c.kind === "valueRange") {
		const n =
			typeof value === "bigint"
				? value
				: typeof value === "number"
					? BigInt(value)
					: undefined;
		if (n !== undefined) {
			const min =
				typeof c.min === "bigint"
					? c.min
					: c.min === "MIN"
						? undefined
						: BigInt(c.min);
			const max =
				typeof c.max === "bigint"
					? c.max
					: c.max === "MAX"
						? undefined
						: BigInt(c.max);
			if (min !== undefined && n < min) {
				violations.push({ constraint: c, message: `Value ${n} < min ${min}` });
			}
			if (max !== undefined && n > max) {
				violations.push({ constraint: c, message: `Value ${n} > max ${max}` });
			}
		}
		return;
	}

	if (c.kind === "size") {
		const len =
			typeof value === "string"
				? BigInt(value.length)
				: value instanceof Uint8Array
					? BigInt(value.byteLength)
					: Array.isArray(value)
						? BigInt(value.length)
						: undefined;
		if (len !== undefined) {
			const min =
				typeof c.min === "bigint"
					? c.min
					: c.min === "MIN"
						? 0n
						: BigInt(c.min);
			const max =
				typeof c.max === "bigint"
					? c.max
					: c.max === "MAX"
						? undefined
						: BigInt(c.max);
			if (len < min) {
				violations.push({ constraint: c, message: `Size ${len} < min ${min}` });
			}
			if (max !== undefined && len > max) {
				violations.push({ constraint: c, message: `Size ${len} > max ${max}` });
			}
		}
		return;
	}

	if (c.kind === "permittedAlphabet") {
		if (typeof value === "string") {
			for (const ch of value) {
				if (!c.alphabet.includes(ch)) {
					violations.push({
						constraint: c,
						message: `Character "${ch}" not in permitted alphabet`,
					});
					break;
				}
			}
		}
		return;
	}

	if (c.kind === "extensibleConstraint") {
		// Extension root is checked; extension additions are not.
		checkOneConstraint(c.constraint, value, violations);
		return;
	}
}
