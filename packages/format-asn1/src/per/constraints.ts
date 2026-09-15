import { bigIntBitLength } from "@ac-kit/core";

import type { AnyConstraintDef } from "../schema/constraints/common.js";
import { AnyAsn1TypeDef } from "../schema/types/any-def.js";

export interface SizeRange {
	lb: bigint;
	ub: bigint | "MAX";
}

export interface ValueRange {
	lb: bigint | "MIN";
	ub: bigint | "MAX";
}

export function getSizeConstraint(def: AnyAsn1TypeDef): SizeRange | undefined {
	const constraints = (def as { constraints?: readonly AnyConstraintDef[] })
		.constraints;
	if (!constraints) return undefined;
	for (const c of constraints) {
		if (c.kind === "size") {
			const min = c.min === "MIN" ? 0n : BigInt(c.min as bigint | number);
			const max =
				c.max === "MAX" ? ("MAX" as const) : BigInt(c.max as bigint | number);
			return { lb: min, ub: max };
		}
	}
	return undefined;
}

/** Extract the effective value range (lb, ub) from a def, if present. */
export function getValueRange(def: AnyAsn1TypeDef): ValueRange | undefined {
	const constraints = (def as { constraints?: readonly AnyConstraintDef[] })
		.constraints;
	if (!constraints) return undefined;
	for (const c of constraints) {
		if (c.kind === "valueRange") {
			const lb: bigint | "MIN" =
				c.min === "MIN" ? "MIN" : BigInt(c.min as bigint | number);
			const ub: bigint | "MAX" =
				c.max === "MAX" ? "MAX" : BigInt(c.max as bigint | number);
			return { lb, ub };
		}
	}
	return undefined;
}

/** Minimum number of bits needed to represent values 0..range (inclusive). */
export function bitsNeeded(range: bigint): number {
	if (range < 0n) return 0;
	return Math.max(1, bigIntBitLength(range));
}
