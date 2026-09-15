import type { Asn1TypeDefBase } from "../../def.js";
import { ref, wrapSchema, type Asn1Type } from "../base.js";
import type { Asn1ClassFieldDef } from "./class-field.js";
import type { Asn1ClassType, Asn1ClassTypeDef } from "./class.js";

/** X.681 information object descriptor. */
export type Asn1InformationObjectTypeDef = Asn1TypeDefBase<
	"informationObject",
	unknown
> & {
	readonly class: Asn1ClassTypeDef;
	readonly fields: Readonly<Record<string, unknown>>;
};

/**
 * Schema for an X.681 information object. `C`/`F` are phantom (unused in the
 * body).
 */
export type Asn1InformationObjectType<
	_C,
	_F extends Readonly<Record<string, Asn1ClassFieldDef>>,
> = Asn1Type<Asn1InformationObjectTypeDef>;

export function informationObjectSchema(
	def: Asn1InformationObjectTypeDef,
): Asn1InformationObjectType<unknown, any> {
	return wrapSchema(def, informationObjectSchema);
}

/** X.681 information object set descriptor. */
export type Asn1InformationObjectSetTypeDef = Asn1TypeDefBase<
	"informationObjectSet",
	unknown
> & {
	readonly class: Asn1ClassTypeDef;
	readonly objects: readonly Asn1InformationObjectTypeDef[];
};

/**
 * Schema for an X.681 information object set. `C`/`F` are phantom (unused in
 * the body).
 */
export type Asn1InformationObjectSetType<
	_C,
	_F extends Readonly<Record<string, Asn1ClassFieldDef>>,
> = Asn1Type<Asn1InformationObjectSetTypeDef>;

export function informationObjectSetSchema(
	def: Asn1InformationObjectSetTypeDef,
): Asn1InformationObjectSetType<unknown, any> {
	return wrapSchema(def, informationObjectSetSchema);
}

/** Factory: create an information object. */
export function informationObject<
	C extends Asn1ClassType<F>,
	F extends Readonly<Record<string, Asn1ClassFieldDef>>,
>(
	cls: C,
	fields: Readonly<Record<string, unknown>>,
): Asn1InformationObjectType<C, F> {
	return informationObjectSchema({
		kind: "informationObject",
		class: ref(cls),
		fields,
	});
}

/** Factory: create an information object set. */
export function informationObjectSet<
	C extends Asn1ClassType<F>,
	F extends Readonly<Record<string, Asn1ClassFieldDef>>,
>(
	cls: C,
	objects: readonly Asn1InformationObjectType<C, F>[],
): Asn1InformationObjectSetType<C, F> {
	return informationObjectSetSchema({
		kind: "informationObjectSet",
		class: ref(cls),
		objects: objects.map((o) => ref(o)),
	});
}
