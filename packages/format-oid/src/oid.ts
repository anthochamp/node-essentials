/**
 * Object Identifier (OID) and Relative OID types, validation, arithmetic, and
 * format conversion.
 *
 * OID values are represented as `readonly number[]` of non-negative arc
 * components, already decoded from BER's first-two-arc compression.
 *
 * @spec X.660 — Procedures for the operation of object identifier registration
 *               authorities: General procedures and top arcs
 * @spec X.680 §32 — Object identifier type and value notation
 * @spec X.680 §33 — Relative object identifier type and value notation
 */

import { OidError } from "./errors.js";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * An ASN.1 Object Identifier value.
 *
 * A non-empty, ordered sequence of non-negative integer arc components with at
 * least two components. The first component identifies the root registration
 * authority (0 = itu-t, 1 = iso, 2 = joint-iso-itu-t).
 *
 * @spec X.680 §32.3 — Object identifier value notation
 */
export type ObjectIdentifier = readonly number[];

/**
 * An ASN.1 Relative OID value.
 *
 * An ordered sequence of non-negative integer arc components with no structural
 * restrictions on count (may be empty).
 *
 * @spec X.680 §33.3 — Relative object identifier value notation
 */
export type RelativeObjectIdentifier = readonly number[];

// ─── Well-known root arc values (X.660 §C.2) ─────────────────────────────────

/**
 * Well-known first-arc values as defined by X.660 §C.2.
 *
 * Each identifies one of the three top-level registration authorities in the
 * global OID tree.
 *
 * @spec X.660 §C.2 — Top-level OID arc assignments
 */
export const wellKnownRootArcs = {
	/**
	 * 0 — ITU-T (formerly CCITT). Managed by the International Telecommunication
	 * Union — Telecommunication.
	 */
	ituT: 0,
	/** 1 — ISO/IEC. Managed by the International Organization for Standardization. */
	iso: 1,
	/**
	 * 2 — Joint ISO/ITU-T. Managed jointly by ISO and ITU-T. The second arc has
	 * no upper bound, unlike itu-t and iso where the second arc must be 0..39.
	 */
	jointIsoItuT: 2,
} as const;

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates an OID value against X.660 §7.1 and X.680 §32.3 structural rules:
 *
 * - At least two arc components.
 * - All components are non-negative integers.
 * - First arc is 0 (itu-t), 1 (iso), or 2 (joint-iso-itu-t).
 * - Second arc is 0..39 when first arc is 0 or 1. (For first arc 2 /
 *   joint-iso-itu-t, no upper bound applies.)
 *
 * @throws {OidError} If any rule is violated.
 * @spec X.660 §7.1 — Arc identification rules
 * @spec X.680 §32.3 — Object identifier value notation
 */
export function validateOid(oid: ObjectIdentifier): void {
	if (oid.length < 2) {
		throw new OidError(
			`OID must have at least 2 arc components, got ${oid.length}`,
		);
	}
	for (let i = 0; i < oid.length; i++) {
		const arc = oid[i];
		if (arc === undefined || !Number.isInteger(arc) || arc < 0) {
			throw new OidError(
				`OID arc at index ${i} must be a non-negative integer`,
			);
		}
	}
	// oid.length >= 2 is guaranteed above; casts are safe.
	const first = oid[0]!;
	const second = oid[1]!;
	if (first > 2) {
		throw new OidError(
			`First OID arc must be 0 (itu-t), 1 (iso), or 2 (joint-iso-itu-t); got ${first}`,
		);
	}
	if ((first === 0 || first === 1) && second > 39) {
		throw new OidError(
			`Second OID arc must be 0..39 when first arc is ${first}; got ${second}`,
		);
	}
}

/**
 * Validates a Relative OID value per X.680 §33.3:
 *
 * - All components must be non-negative integers.
 * - May be empty (empty relative OID is valid).
 *
 * @throws {OidError} If any component is not a non-negative integer.
 * @spec X.680 §33.3 — Relative object identifier value notation
 */
export function validateRelativeOid(relOid: RelativeObjectIdentifier): void {
	for (let i = 0; i < relOid.length; i++) {
		const arc = relOid[i];
		if (arc === undefined || !Number.isInteger(arc) || arc < 0) {
			throw new OidError(
				`Relative OID arc at index ${i} must be a non-negative integer`,
			);
		}
	}
}

// ─── Equality and prefix ──────────────────────────────────────────────────────

/** Returns `true` if the two OIDs have identical arc sequences. */
export function oidEqual(a: ObjectIdentifier, b: ObjectIdentifier): boolean {
	if (a.length !== b.length) {
		return false;
	}
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) {
			return false;
		}
	}
	return true;
}

/** Returns `true` if `prefix` is a prefix of (or equal to) `oid`. */
export function oidStartsWith(
	oid: ObjectIdentifier,
	prefix: ObjectIdentifier,
): boolean {
	if (prefix.length > oid.length) {
		return false;
	}
	for (let i = 0; i < prefix.length; i++) {
		if (oid[i] !== prefix[i]) {
			return false;
		}
	}
	return true;
}

// ─── Arithmetic ───────────────────────────────────────────────────────────────

/**
 * Returns the relative OID from `base` to `oid` (the arc suffix after `base`).
 *
 * @throws {OidError} If `oid` does not start with `base`.
 * @spec X.680 §33 — Relative OID as a sub-tree path relative to an absolute OID
 */
export function oidRelative(
	oid: ObjectIdentifier,
	base: ObjectIdentifier,
): RelativeObjectIdentifier {
	if (!oidStartsWith(oid, base)) {
		throw new OidError(
			`OID ${oidToDotted(oid)} does not start with base ${oidToDotted(base)}`,
		);
	}
	return oid.slice(base.length);
}

/**
 * Appends relative OID components to a base OID, returning a new OID.
 *
 * The result is not validated; the caller is responsible for ensuring the base
 * OID is already valid.
 */
export function oidAppend(
	base: ObjectIdentifier,
	relative: RelativeObjectIdentifier,
): ObjectIdentifier {
	return [...base, ...relative];
}

// ─── Format and parse ─────────────────────────────────────────────────────────

/** Formats an OID as dotted decimal notation (e.g. `"1.2.840.113549"`). */
export function oidToDotted(oid: ObjectIdentifier): string {
	return oid.join(".");
}

/**
 * Parses a dotted decimal OID string (e.g. `"1.2.840.113549"`) and validates
 * the result per X.660 §7.1 and X.680 §32.3.
 *
 * @throws {OidError} If the string is malformed or fails structural validation.
 */
export function oidFromDotted(dotted: string): ObjectIdentifier {
	if (dotted.length === 0) {
		throw new OidError("OID string must not be empty");
	}
	const parts = dotted.split(".");
	const components: number[] = [];
	for (const part of parts) {
		if (!/^\d+$/.test(part)) {
			throw new OidError(`Invalid OID arc "${part}" in "${dotted}"`);
		}
		components.push(Number.parseInt(part, 10));
	}
	validateOid(components);
	return components;
}

/**
 * Formats a Relative OID as dotted decimal notation. Returns an empty string
 * for the empty relative OID.
 */
export function relativeOidToDotted(relOid: RelativeObjectIdentifier): string {
	return relOid.join(".");
}

/**
 * Parses a dotted decimal Relative OID string. Returns an empty array for an
 * empty string (empty relative OID).
 *
 * @throws {OidError} If any component is malformed.
 */
export function relativeOidFromDotted(
	dotted: string,
): RelativeObjectIdentifier {
	if (dotted.length === 0) {
		return [];
	}
	const parts = dotted.split(".");
	const components: number[] = [];
	for (const part of parts) {
		if (!/^\d+$/.test(part)) {
			throw new OidError(`Invalid relative OID arc "${part}" in "${dotted}"`);
		}
		components.push(Number.parseInt(part, 10));
	}
	validateRelativeOid(components);
	return components;
}
