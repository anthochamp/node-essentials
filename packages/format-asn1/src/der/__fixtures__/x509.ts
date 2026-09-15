/**
 * RFC 5280 X.509 Certificate AnyAsn1TypeDef definitions for codec testing.
 * Exports .def directly since E2E tests only need the def, not type-safe schema
 * classes. Uses ANY for parameters/extension values to preserve bytes on
 * decode→encode round-trip.
 */

import {
	contextImplicitTag,
	contextTag,
	ref,
} from "../../schema/types/base.js";
import { choice } from "../../schema/types/constructed/choice.js";
import {
	alternative,
	component,
} from "../../schema/types/constructed/component.js";
import { sequenceOf } from "../../schema/types/constructed/sequence-of.js";
import { sequence } from "../../schema/types/constructed/sequence.js";
import { setOf } from "../../schema/types/constructed/set-of.js";
import { any } from "../../schema/types/primitives/any.js";
import { bitString } from "../../schema/types/primitives/bit-string.js";
import { boolean } from "../../schema/types/primitives/boolean.js";
import { integer } from "../../schema/types/primitives/integer.js";
import { objectIdentifier } from "../../schema/types/primitives/object-identifier.js";
import { octetString } from "../../schema/types/primitives/octet-string.js";
import { generalizedTime } from "../../schema/types/time/generalized-time.js";
import { utcTime } from "../../schema/types/time/utc-time.js";

const _AlgorithmIdentifier = sequence([
	component("algorithm", objectIdentifier()),
	component("parameters", any()).optional(),
] as const);
const _AttributeTypeAndValue = sequence([
	component("type", objectIdentifier()),
	component("value", any()),
] as const);
const _RelativeDistinguishedName = setOf(_AttributeTypeAndValue);
const _RDNSequence = sequenceOf(_RelativeDistinguishedName);
const _Name = choice([alternative("rdnSequence", _RDNSequence)] as const);
const _Time = choice([
	alternative("utcTime", utcTime()),
	alternative("generalTime", generalizedTime()),
] as const);
const _Validity = sequence([
	component("notBefore", _Time),
	component("notAfter", _Time),
] as const);
const _SubjectPublicKeyInfo = sequence([
	component("algorithm", _AlgorithmIdentifier),
	component("subjectPublicKey", bitString()),
] as const);
const _Extension = sequence([
	component("extnID", objectIdentifier()),
	component("critical", boolean()).optional(),
	component("extnValue", octetString()),
] as const);
const _Extensions = sequenceOf(_Extension);
const _TBSCertificate = sequence([
	component("version", contextTag(0, integer())).optional(),
	component("serialNumber", integer()),
	component("signature", _AlgorithmIdentifier),
	component("issuer", _Name),
	component("validity", _Validity),
	component("subject", _Name),
	component("subjectPublicKeyInfo", _SubjectPublicKeyInfo),
	component("issuerUniqueID", contextImplicitTag(1, bitString())).optional(),
	component("subjectUniqueID", contextImplicitTag(2, bitString())).optional(),
	component("extensions", contextTag(3, _Extensions)).optional(),
] as const);
const _Certificate = sequence([
	component("tbsCertificate", _TBSCertificate),
	component("signatureAlgorithm", _AlgorithmIdentifier),
	component("signature", bitString()),
] as const);

// Export the defs (AnyAsn1TypeDef) and the schema instances for tests that need them
export const AlgorithmIdentifierDef = ref(_AlgorithmIdentifier);
export const ExtensionDef = ref(_Extension);
export const TBSCertificateDef = ref(_TBSCertificate);
export const CertificateDef = ref(_Certificate);

// Structural exports for schema tests — not needed for codec E2E
export const TBSCertificateComponents = ref(_TBSCertificate);
