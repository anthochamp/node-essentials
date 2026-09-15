/**
 * AlgorithmIdentifier — X.509 / RFC 5280 §4.1.1.2
 *
 * ```asn1
 * AlgorithmIdentifier  ::=  SEQUENCE  {
 *      algorithm               OBJECT IDENTIFIER,
 *      parameters              ANY DEFINED BY algorithm OPTIONAL  }
 * ```
 *
 * This fixture exercises: SEQUENCE, OBJECT IDENTIFIER, ANY, and OPTIONAL.
 */

import { module } from "../module.js";
import { component } from "../types/constructed/component.js";
import { sequence } from "../types/constructed/sequence.js";
import { any } from "../types/primitives/any.js";
import { objectIdentifier } from "../types/primitives/object-identifier.js";

export const AlgorithmIdentifier = sequence([
	component("algorithm", objectIdentifier()),
	component("parameters", any()).optional(),
]);

export const PkixModule = module(
	{ name: "PKIX1Explicit88", oid: [1, 3, 6, 1, 5, 5, 7, 0, 1] },
	{ AlgorithmIdentifier },
);
