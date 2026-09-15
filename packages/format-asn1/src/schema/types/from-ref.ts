import { AnyAsn1TypeDef } from "./any-def.js";
import { taggedType, transformType, type Asn1Type } from "./base.js";
import { choiceSchema } from "./constructed/choice.js";
import { sequenceOfSchema } from "./constructed/sequence-of.js";
import { sequenceSchema } from "./constructed/sequence.js";
import { setOfSchema } from "./constructed/set-of.js";
import { setSchema } from "./constructed/set.js";
import { classTypeSchema } from "./information-object/class.js";
import {
	informationObjectSchema,
	informationObjectSetSchema,
} from "./information-object/information-object.js";
import { openTypeSchema } from "./information-object/open-type.js";
import { characterStringSchema } from "./legacy/character-string.js";
import { embeddedPdvSchema } from "./legacy/embedded-pdv.js";
import { externalSchema } from "./legacy/external.js";
import {
	paramRefSchema,
	paramValueRefSchema,
	parameterizedTypeInstanceSchema,
} from "./parameterized/parameterized-type.js";
import { anySchema } from "./primitives/any.js";
import { bitStringSchema } from "./primitives/bit-string.js";
import { booleanSchema } from "./primitives/boolean.js";
import { enumeratedSchema } from "./primitives/enumerated.js";
import { integerSchema } from "./primitives/integer.js";
import { lazySchema } from "./primitives/lazy.js";
import { nullSchema } from "./primitives/null.js";
import { objectIdentifierSchema } from "./primitives/object-identifier.js";
import { octetStringSchema } from "./primitives/octet-string.js";
import { oidIriSchema } from "./primitives/oid-iri.js";
import { realSchema } from "./primitives/real.js";
import { relativeOidIriSchema } from "./primitives/relative-oid-iri.js";
import { relativeOidSchema } from "./primitives/relative-oid.js";
import { bmpStringSchema } from "./strings/bmp-string.js";
import { generalStringSchema } from "./strings/general-string.js";
import { graphicStringSchema } from "./strings/graphic-string.js";
import { ia5StringSchema } from "./strings/ia5-string.js";
import { numericStringSchema } from "./strings/numeric-string.js";
import { printableStringSchema } from "./strings/printable-string.js";
import { teletexStringSchema } from "./strings/teletex-string.js";
import { universalStringSchema } from "./strings/universal-string.js";
import { utf8StringSchema } from "./strings/utf8-string.js";
import { videotexStringSchema } from "./strings/videotex-string.js";
import { visibleStringSchema } from "./strings/visible-string.js";
import { dateTimeSchema } from "./time/date-time.js";
import { dateSchema } from "./time/date.js";
import { durationSchema } from "./time/duration.js";
import { generalizedTimeSchema } from "./time/generalized-time.js";
import { timeOfDaySchema } from "./time/time-of-day.js";
import { timeSchema } from "./time/time.js";
import { utcTimeSchema } from "./time/utc-time.js";

type Wrapper = (def: never) => Asn1Type<AnyAsn1TypeDef>;

// Each wrap function has its own generic signature (`sequenceSchema<C>`,
// `lazySchema<T>`, ...) that can't be soundly unified into one shape — the
// object literal is built against its own inferred (heterogeneous) type, then
// reinterpreted as the uniform dispatch table `fromRef` actually needs.
const wrappers = {
	boolean: booleanSchema,
	integer: integerSchema,
	bitString: bitStringSchema,
	octetString: octetStringSchema,
	null: nullSchema,
	objectIdentifier: objectIdentifierSchema,
	relativeOid: relativeOidSchema,
	real: realSchema,
	enumerated: enumeratedSchema,
	any: anySchema,
	oidIri: oidIriSchema,
	relativeOidIri: relativeOidIriSchema,
	utf8String: utf8StringSchema,
	numericString: numericStringSchema,
	printableString: printableStringSchema,
	teletexString: teletexStringSchema,
	videotexString: videotexStringSchema,
	ia5String: ia5StringSchema,
	graphicString: graphicStringSchema,
	visibleString: visibleStringSchema,
	generalString: generalStringSchema,
	universalString: universalStringSchema,
	bmpString: bmpStringSchema,
	utcTime: utcTimeSchema,
	generalizedTime: generalizedTimeSchema,
	time: timeSchema,
	date: dateSchema,
	timeOfDay: timeOfDaySchema,
	dateTime: dateTimeSchema,
	duration: durationSchema,
	sequence: sequenceSchema,
	sequenceOf: sequenceOfSchema,
	set: setSchema,
	setOf: setOfSchema,
	choice: choiceSchema,
	tagged: taggedType,
	transform: transformType,
	lazy: lazySchema,
	class: classTypeSchema,
	informationObject: informationObjectSchema,
	informationObjectSet: informationObjectSetSchema,
	openType: openTypeSchema,
	paramRef: paramRefSchema,
	paramValueRef: paramValueRefSchema,
	parameterizedTypeInstance: parameterizedTypeInstanceSchema,
	external: externalSchema,
	embeddedPdv: embeddedPdvSchema,
	characterString: characterStringSchema,
} as unknown as Readonly<Record<AnyAsn1TypeDef["kind"], Wrapper>>;

/** Reconstruct a chainable schema from a raw def tree — the inverse of `ref()`. */
export function fromRef<D extends AnyAsn1TypeDef>(def: D): Asn1Type<D> {
	return wrappers[def.kind](def as never) as Asn1Type<D>;
}
