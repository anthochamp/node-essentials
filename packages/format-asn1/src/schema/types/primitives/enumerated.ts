import type { Asn1TypeDefBase } from "../../def.js";
import type { NamedNumber } from "../../values.js";
import { wrapSchema, type Asn1Type } from "../base.js";

/** ENUMERATED type descriptor. */
export type Asn1EnumeratedTypeDef = Asn1TypeDefBase<"enumerated", bigint> & {
	readonly namedNumbers: readonly NamedNumber[];
	readonly extensible?: boolean;
};

export type Asn1EnumeratedType = Asn1Type<Asn1EnumeratedTypeDef> & {
	/** Attach named-number (enumeration) values. */
	namedNumbers(
		map: Readonly<Record<string, bigint | number>>,
	): Asn1EnumeratedType;
	/** Mark this enumeration as extensible. */
	extensible(): Asn1EnumeratedType;
};

export function enumeratedSchema(
	def: Asn1EnumeratedTypeDef,
): Asn1EnumeratedType {
	return {
		...wrapSchema(def, enumeratedSchema),
		namedNumbers(map) {
			const named: NamedNumber[] = Object.entries(map).map(([name, value]) => ({
				name,
				value: typeof value === "number" ? BigInt(value) : value,
			}));
			return enumeratedSchema({ ...def, namedNumbers: named });
		},
		extensible() {
			return enumeratedSchema({ ...def, extensible: true });
		},
	};
}

/** Factory: `ENUMERATED`. */
export function enumerated(): Asn1EnumeratedType {
	return enumeratedSchema({ kind: "enumerated", namedNumbers: [] });
}
