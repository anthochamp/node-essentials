import { Asn1TaggedTypeDef, Asn1TransformTypeDef } from "./base.js";
import { Asn1ChoiceTypeDef } from "./constructed/choice.js";
import { Asn1SequenceOfTypeDef } from "./constructed/sequence-of.js";
import { Asn1SequenceTypeDef } from "./constructed/sequence.js";
import { Asn1SetOfTypeDef } from "./constructed/set-of.js";
import { Asn1SetTypeDef } from "./constructed/set.js";
import { Asn1ClassTypeDef } from "./information-object/class.js";
import {
	Asn1InformationObjectSetTypeDef,
	Asn1InformationObjectTypeDef,
} from "./information-object/information-object.js";
import { Asn1OpenTypeDef } from "./information-object/open-type.js";
import { Asn1CharacterStringTypeDef } from "./legacy/character-string.js";
import { Asn1EmbeddedPdvTypeDef } from "./legacy/embedded-pdv.js";
import { Asn1ExternalTypeDef } from "./legacy/external.js";
import {
	Asn1ParamRefTypeDef,
	Asn1ParamValueRefTypeDef,
	Asn1ParameterizedTypeInstanceDef,
} from "./parameterized/parameterized-type.js";
import { Asn1AnyTypeDef } from "./primitives/any.js";
import { Asn1BitStringTypeDef } from "./primitives/bit-string.js";
import { Asn1BooleanTypeDef } from "./primitives/boolean.js";
import { Asn1EnumeratedTypeDef } from "./primitives/enumerated.js";
import { Asn1IntegerTypeDef } from "./primitives/integer.js";
import { Asn1LazyTypeDef } from "./primitives/lazy.js";
import { Asn1NullTypeDef } from "./primitives/null.js";
import { Asn1ObjectIdentifierTypeDef } from "./primitives/object-identifier.js";
import { Asn1OctetStringTypeDef } from "./primitives/octet-string.js";
import { Asn1OidIriTypeDef } from "./primitives/oid-iri.js";
import { Asn1RealTypeDef } from "./primitives/real.js";
import { Asn1RelativeOidIriTypeDef } from "./primitives/relative-oid-iri.js";
import { Asn1RelativeOidTypeDef } from "./primitives/relative-oid.js";
import { Asn1BmpStringTypeDef } from "./strings/bmp-string.js";
import { Asn1GeneralStringTypeDef } from "./strings/general-string.js";
import { Asn1GraphicStringTypeDef } from "./strings/graphic-string.js";
import { Asn1Ia5StringTypeDef } from "./strings/ia5-string.js";
import { Asn1NumericStringTypeDef } from "./strings/numeric-string.js";
import { Asn1PrintableStringTypeDef } from "./strings/printable-string.js";
import { Asn1TeletexStringTypeDef } from "./strings/teletex-string.js";
import { Asn1UniversalStringTypeDef } from "./strings/universal-string.js";
import { Asn1Utf8StringTypeDef } from "./strings/utf8-string.js";
import { Asn1VideotexStringTypeDef } from "./strings/videotex-string.js";
import { Asn1VisibleStringTypeDef } from "./strings/visible-string.js";
import { Asn1DateTimeTypeDef } from "./time/date-time.js";
import { Asn1DateTypeDef } from "./time/date.js";
import { Asn1DurationTypeDef } from "./time/duration.js";
import { Asn1GeneralizedTimeTypeDef } from "./time/generalized-time.js";
import { Asn1TimeOfDayTypeDef } from "./time/time-of-day.js";
import { Asn1TimeTypeDef } from "./time/time.js";
import { Asn1UtcTimeTypeDef } from "./time/utc-time.js";

export type AnyAsn1TypeDef =
	| Asn1BooleanTypeDef
	| Asn1IntegerTypeDef
	| Asn1BitStringTypeDef
	| Asn1OctetStringTypeDef
	| Asn1NullTypeDef
	| Asn1ObjectIdentifierTypeDef
	| Asn1RelativeOidTypeDef
	| Asn1RealTypeDef
	| Asn1EnumeratedTypeDef
	| Asn1AnyTypeDef
	| Asn1OidIriTypeDef
	| Asn1RelativeOidIriTypeDef
	| Asn1Utf8StringTypeDef
	| Asn1NumericStringTypeDef
	| Asn1PrintableStringTypeDef
	| Asn1TeletexStringTypeDef
	| Asn1VideotexStringTypeDef
	| Asn1Ia5StringTypeDef
	| Asn1GraphicStringTypeDef
	| Asn1VisibleStringTypeDef
	| Asn1GeneralStringTypeDef
	| Asn1UniversalStringTypeDef
	| Asn1BmpStringTypeDef
	| Asn1UtcTimeTypeDef
	| Asn1GeneralizedTimeTypeDef
	| Asn1TimeTypeDef
	| Asn1DateTypeDef
	| Asn1TimeOfDayTypeDef
	| Asn1DateTimeTypeDef
	| Asn1DurationTypeDef
	| Asn1SequenceTypeDef
	| Asn1SequenceOfTypeDef
	| Asn1SetTypeDef
	| Asn1SetOfTypeDef
	| Asn1ChoiceTypeDef
	| Asn1TaggedTypeDef
	| Asn1TransformTypeDef
	| Asn1LazyTypeDef
	| Asn1ClassTypeDef
	| Asn1InformationObjectTypeDef
	| Asn1InformationObjectSetTypeDef
	| Asn1OpenTypeDef
	| Asn1ParamRefTypeDef
	| Asn1ParamValueRefTypeDef
	| Asn1ParameterizedTypeInstanceDef
	| Asn1ExternalTypeDef
	| Asn1EmbeddedPdvTypeDef
	| Asn1CharacterStringTypeDef;
