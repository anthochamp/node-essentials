import type { Asn1TypeDefBase } from "../../def.js";

/** Time-def discriminants introduced by the X.680 time family. */
export type Asn1TimeKind =
	| "utcTime"
	| "generalizedTime"
	| "time"
	| "date"
	| "timeOfDay"
	| "dateTime"
	| "duration";

/** Shared shape for the plain-string time-family type descriptors. */
export type Asn1TimeKindDef<K extends Asn1TimeKind = Asn1TimeKind> =
	Asn1TypeDefBase<K, string>;
