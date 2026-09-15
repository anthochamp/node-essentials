import { AnyAsn1TypeDef } from "../any-def.js";
import type { Asn1ClassTypeDef } from "./class.js";
import type {
	Asn1InformationObjectSetTypeDef,
	Asn1InformationObjectTypeDef,
} from "./information-object.js";

/** `WITH SYNTAX` token stream used by X.681 class definitions. */
export type SyntaxToken<FieldNames extends string = string> =
	| string
	| { readonly field: FieldNames }
	| { readonly optional: readonly SyntaxToken<FieldNames>[] };

/** X.681 class type-field descriptor (`&T`). */
export type Asn1ClassTypeFieldDef = {
	readonly fieldKind: "type";
	readonly name: string;
	readonly optional?: boolean;
	readonly defaultType?: AnyAsn1TypeDef;
};

/** X.681 class fixed-type value-field descriptor. */
export type Asn1ClassFixedTypeValueFieldDef = {
	readonly fieldKind: "fixedTypeValue";
	readonly name: string;
	readonly type: AnyAsn1TypeDef;
	readonly unique?: boolean;
	readonly optional?: boolean;
	readonly defaultValue?: unknown;
};

/** X.681 class variable-type value-field descriptor. */
export type Asn1ClassVariableTypeValueFieldDef = {
	readonly fieldKind: "variableTypeValue";
	readonly name: string;
	readonly typeFieldRef: string;
	readonly optional?: boolean;
};

/** X.681 class fixed-type value-set field descriptor. */
export type Asn1ClassFixedTypeValueSetFieldDef = {
	readonly fieldKind: "fixedTypeValueSet";
	readonly name: string;
	readonly type: AnyAsn1TypeDef;
	readonly optional?: boolean;
	readonly defaultValueSet?: readonly unknown[];
};

/** X.681 class variable-type value-set field descriptor. */
export type Asn1ClassVariableTypeValueSetFieldDef = {
	readonly fieldKind: "variableTypeValueSet";
	readonly name: string;
	readonly typeFieldRef: string;
	readonly optional?: boolean;
	readonly defaultValueSet?: readonly unknown[];
};

/** X.681 class information-object field descriptor. */
export type Asn1ClassInformationObjectFieldDef = {
	readonly fieldKind: "informationObject";
	readonly name: string;
	readonly class: Asn1ClassTypeDef;
	readonly optional?: boolean;
	readonly defaultObject?: Asn1InformationObjectTypeDef;
};

/** X.681 class information-object-set field descriptor. */
export type Asn1ClassInformationObjectSetFieldDef = {
	readonly fieldKind: "informationObjectSet";
	readonly name: string;
	readonly class: Asn1ClassTypeDef;
	readonly optional?: boolean;
	readonly defaultObjectSet?: Asn1InformationObjectSetTypeDef;
};

/** Union of all X.681 class field definitions. */
export type Asn1ClassFieldDef =
	| Asn1ClassTypeFieldDef
	| Asn1ClassFixedTypeValueFieldDef
	| Asn1ClassVariableTypeValueFieldDef
	| Asn1ClassFixedTypeValueSetFieldDef
	| Asn1ClassVariableTypeValueSetFieldDef
	| Asn1ClassInformationObjectFieldDef
	| Asn1ClassInformationObjectSetFieldDef;

/** Factory: `&T` — type field. */
export function classTypeField(
	name: string,
	options?: { optional?: boolean; defaultType?: AnyAsn1TypeDef },
): Asn1ClassTypeFieldDef {
	return {
		fieldKind: "type",
		name,
		...(options?.optional !== undefined ? { optional: options.optional } : {}),
		...(options?.defaultType !== undefined
			? { defaultType: options.defaultType }
			: {}),
	};
}

/** Factory: fixed-type value field. */
export function classFixedTypeValueField(
	name: string,
	type: AnyAsn1TypeDef,
	options?: { unique?: boolean; optional?: boolean; defaultValue?: unknown },
): Asn1ClassFixedTypeValueFieldDef {
	return {
		fieldKind: "fixedTypeValue",
		name,
		type,
		...(options?.unique !== undefined ? { unique: options.unique } : {}),
		...(options?.optional !== undefined ? { optional: options.optional } : {}),
		...(options?.defaultValue !== undefined
			? { defaultValue: options.defaultValue }
			: {}),
	};
}

/** Factory: variable-type value field. */
export function classVariableTypeValueField(
	name: string,
	typeFieldRef: string,
	options?: { optional?: boolean },
): Asn1ClassVariableTypeValueFieldDef {
	return {
		fieldKind: "variableTypeValue",
		name,
		typeFieldRef,
		...(options?.optional !== undefined ? { optional: options.optional } : {}),
	};
}

/** Factory: information-object field. */
export function classInformationObjectField(
	name: string,
	cls: Asn1ClassTypeDef,
	options?: {
		optional?: boolean;
		defaultObject?: Asn1InformationObjectTypeDef;
	},
): Asn1ClassInformationObjectFieldDef {
	return {
		fieldKind: "informationObject",
		name,
		class: cls,
		...(options?.optional !== undefined ? { optional: options.optional } : {}),
		...(options?.defaultObject !== undefined
			? { defaultObject: options.defaultObject }
			: {}),
	};
}

/** Factory: information-object-set field. */
export function classInformationObjectSetField(
	name: string,
	cls: Asn1ClassTypeDef,
	options?: {
		optional?: boolean;
		defaultObjectSet?: Asn1InformationObjectSetTypeDef;
	},
): Asn1ClassInformationObjectSetFieldDef {
	return {
		fieldKind: "informationObjectSet",
		name,
		class: cls,
		...(options?.optional !== undefined ? { optional: options.optional } : {}),
		...(options?.defaultObjectSet !== undefined
			? { defaultObjectSet: options.defaultObjectSet }
			: {}),
	};
}
