import type { Asn1TypeDefBase } from "../../def.js";
import { wrapSchema, type Asn1Type } from "../base.js";
import type { Asn1ClassFieldDef, SyntaxToken } from "./class-field.js";

/** X.681 information object class descriptor. */
export type Asn1ClassTypeDef<
	Fields extends Readonly<Record<string, Asn1ClassFieldDef>> = Readonly<
		Record<string, Asn1ClassFieldDef>
	>,
> = Asn1TypeDefBase<"class", unknown> & {
	readonly fields: readonly Asn1ClassFieldDef[];
	readonly withSyntax?: readonly SyntaxToken[];
	/** @internal phantom marker carrying the field-name literal types. */
	readonly __fields?: Fields;
};

/**
 * Schema representing an ASN.1 information object class (X.681). `Fields` is a
 * record mapping field names to their field descriptors.
 */
export type Asn1ClassType<
	Fields extends Readonly<Record<string, Asn1ClassFieldDef>>,
> = Asn1Type<Asn1ClassTypeDef<Fields>> & {
	/**
	 * Attach a `WITH SYNTAX` specification to this class definition. Field
	 * references are type-checked against the class's field names.
	 */
	withSyntax(
		spec: readonly SyntaxToken<string & keyof Fields>[],
	): Asn1ClassType<Fields>;
};

export function classTypeSchema<
	Fields extends Readonly<Record<string, Asn1ClassFieldDef>>,
>(def: Asn1ClassTypeDef<Fields>): Asn1ClassType<Fields> {
	return {
		...wrapSchema(def, classTypeSchema),
		withSyntax(spec) {
			return classTypeSchema({ ...def, withSyntax: spec });
		},
	};
}

/** Factory: create an information object class. */
export function classType<
	Fields extends Readonly<Record<string, Asn1ClassFieldDef>>,
>(fields: Fields): Asn1ClassType<Fields> {
	const fieldList: Asn1ClassFieldDef[] = Object.values(fields);
	return classTypeSchema({ kind: "class", fields: fieldList });
}
