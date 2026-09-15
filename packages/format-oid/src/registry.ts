/**
 * OID registry: associates OID values with human-readable names and
 * descriptions.
 *
 * `OidRegistry` is a self-contained instance that can be pre-populated with
 * application-specific OIDs. `wellKnownOidRegistry` is a pre-populated instance
 * covering widely used OIDs from PKIX, PKCS, X.500, and related standards.
 */

import type { ObjectIdentifier } from "./oid.js";
import { oidFromDotted, oidToDotted } from "./oid.js";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single entry in an OID registry. */
export interface OidRegistryEntry {
	/** The OID in dotted decimal form (e.g. `"1.2.840.113549.1.1.11"`). */
	readonly dotted: string;
	/** Parsed arc components (cached for direct comparison). */
	readonly components: ObjectIdentifier;
	/** Short human-readable name (e.g. `"sha256WithRSAEncryption"`). */
	readonly name: string;
	/** Optional longer description. */
	readonly description?: string;
}

// ─── OidRegistry class ────────────────────────────────────────────────────────

/**
 * Associates OID values with human-readable names.
 *
 * Instantiate a custom registry for application-specific OIDs, or use the
 * exported `wellKnownOidRegistry` for common PKI, PKCS, and X.500 OIDs.
 *
 * @example
 * 	const registry = new OidRegistry();
 * 	registry.register(
 * 		"1.3.6.1.4.1.99999.1",
 * 		"myApp-version",
 * 		"Application version",
 * 	);
 * 	console.log(registry.formatName([1, 3, 6, 1, 4, 1, 99999, 1])); // "myApp-version"
 */
export class OidRegistry {
	private readonly byDotted = new Map<string, OidRegistryEntry>();

	/**
	 * Registers an OID with a short name and optional description. Overwrites any
	 * existing entry for the same OID.
	 *
	 * @throws {OidError} If `dotted` is not a valid OID string.
	 */
	register(dotted: string, name: string, description?: string): void {
		const components = oidFromDotted(dotted);
		this.byDotted.set(dotted, { dotted, components, name, description });
	}

	/**
	 * Looks up a registry entry by dotted decimal OID string. Returns `undefined`
	 * if the OID is not registered.
	 */
	lookupByDotted(dotted: string): OidRegistryEntry | undefined {
		return this.byDotted.get(dotted);
	}

	/**
	 * Looks up a registry entry by OID components. Returns `undefined` if the OID
	 * is not registered.
	 */
	lookup(oid: ObjectIdentifier): OidRegistryEntry | undefined {
		return this.byDotted.get(oidToDotted(oid));
	}

	/**
	 * Finds the first registered entry whose name exactly matches `name`. Returns
	 * `undefined` if no entry has that name.
	 */
	lookupByName(name: string): OidRegistryEntry | undefined {
		for (const entry of this.byDotted.values()) {
			if (entry.name === name) {
				return entry;
			}
		}
		return;
	}

	/**
	 * Returns the registered short name for `oid`, or its dotted decimal string
	 * if the OID is not in this registry.
	 */
	formatName(oid: ObjectIdentifier): string {
		return this.lookup(oid)?.name ?? oidToDotted(oid);
	}

	/** Returns an iterator over all registered entries. */
	entries(): IterableIterator<OidRegistryEntry> {
		return this.byDotted.values();
	}
}

// ─── Pre-populated well-known OID registry ────────────────────────────────────

/**
 * A pre-populated `OidRegistry` instance covering commonly used OIDs from: -
 * Hash algorithms (NIST FIPS 180-4 / FIPS 202, RFC 8017) - RSA, EC, and EdDSA
 * algorithms (RFC 5480, RFC 8017, RFC 8410) - EC named curves (RFC 5480) -
 * X.509 extensions (RFC 5280) - PKIX access methods and extended key usage (RFC
 * 5280) - X.500 attribute types (X.520, RFC 4519) - PKCS #9 and PKCS content
 * types (RFC 2985, RFC 5652, RFC 7292)
 */
export const wellKnownOidRegistry: OidRegistry = new OidRegistry();

// ── Hash algorithms ────────────────────────────────────────────────────────────
wellKnownOidRegistry.register(
	"2.16.840.1.101.3.4.2.1",
	"sha256",
	"SHA-256 (NIST FIPS 180-4)",
);
wellKnownOidRegistry.register(
	"2.16.840.1.101.3.4.2.2",
	"sha384",
	"SHA-384 (NIST FIPS 180-4)",
);
wellKnownOidRegistry.register(
	"2.16.840.1.101.3.4.2.3",
	"sha512",
	"SHA-512 (NIST FIPS 180-4)",
);
wellKnownOidRegistry.register(
	"2.16.840.1.101.3.4.2.4",
	"sha224",
	"SHA-224 (NIST FIPS 180-4)",
);
wellKnownOidRegistry.register(
	"2.16.840.1.101.3.4.2.5",
	"sha512-224",
	"SHA-512/224 (NIST FIPS 180-4)",
);
wellKnownOidRegistry.register(
	"2.16.840.1.101.3.4.2.6",
	"sha512-256",
	"SHA-512/256 (NIST FIPS 180-4)",
);
wellKnownOidRegistry.register(
	"2.16.840.1.101.3.4.2.7",
	"sha3-224",
	"SHA3-224 (NIST FIPS 202)",
);
wellKnownOidRegistry.register(
	"2.16.840.1.101.3.4.2.8",
	"sha3-256",
	"SHA3-256 (NIST FIPS 202)",
);
wellKnownOidRegistry.register(
	"2.16.840.1.101.3.4.2.9",
	"sha3-384",
	"SHA3-384 (NIST FIPS 202)",
);
wellKnownOidRegistry.register(
	"2.16.840.1.101.3.4.2.10",
	"sha3-512",
	"SHA3-512 (NIST FIPS 202)",
);
wellKnownOidRegistry.register(
	"1.3.14.3.2.26",
	"sha1",
	"SHA-1 (NIST FIPS 180-1)",
);
wellKnownOidRegistry.register("1.2.840.113549.2.5", "md5", "MD5 (RFC 1321)");

// ── RSA and PKCS#1 (RFC 8017) ──────────────────────────────────────────────────
wellKnownOidRegistry.register(
	"1.2.840.113549.1.1.1",
	"rsaEncryption",
	"RSA (RFC 8017)",
);
wellKnownOidRegistry.register(
	"1.2.840.113549.1.1.5",
	"sha1WithRSAEncryption",
	"sha1WithRSAEncryption (RFC 8017)",
);
wellKnownOidRegistry.register(
	"1.2.840.113549.1.1.11",
	"sha256WithRSAEncryption",
	"sha256WithRSAEncryption (RFC 8017)",
);
wellKnownOidRegistry.register(
	"1.2.840.113549.1.1.12",
	"sha384WithRSAEncryption",
	"sha384WithRSAEncryption (RFC 8017)",
);
wellKnownOidRegistry.register(
	"1.2.840.113549.1.1.13",
	"sha512WithRSAEncryption",
	"sha512WithRSAEncryption (RFC 8017)",
);
wellKnownOidRegistry.register(
	"1.2.840.113549.1.1.14",
	"sha224WithRSAEncryption",
	"sha224WithRSAEncryption (RFC 8017)",
);
wellKnownOidRegistry.register(
	"1.2.840.113549.1.1.10",
	"id-RSASSA-PSS",
	"RSASSA-PSS (RFC 8017)",
);

// ── EC and EdDSA (RFC 5480, RFC 8410) ─────────────────────────────────────────
wellKnownOidRegistry.register(
	"1.2.840.10045.2.1",
	"id-ecPublicKey",
	"EC public key (RFC 5480)",
);
wellKnownOidRegistry.register(
	"1.2.840.10045.4.3.2",
	"ecdsa-with-SHA256",
	"ECDSA with SHA-256 (RFC 5480)",
);
wellKnownOidRegistry.register(
	"1.2.840.10045.4.3.3",
	"ecdsa-with-SHA384",
	"ECDSA with SHA-384 (RFC 5480)",
);
wellKnownOidRegistry.register(
	"1.2.840.10045.4.3.4",
	"ecdsa-with-SHA512",
	"ECDSA with SHA-512 (RFC 5480)",
);
wellKnownOidRegistry.register(
	"1.3.101.110",
	"id-X25519",
	"X25519 key agreement (RFC 8410)",
);
wellKnownOidRegistry.register(
	"1.3.101.111",
	"id-X448",
	"X448 key agreement (RFC 8410)",
);
wellKnownOidRegistry.register(
	"1.3.101.112",
	"id-Ed25519",
	"Ed25519 signature (RFC 8410)",
);
wellKnownOidRegistry.register(
	"1.3.101.113",
	"id-Ed448",
	"Ed448 signature (RFC 8410)",
);

// ── EC named curves (RFC 5480) ────────────────────────────────────────────────
wellKnownOidRegistry.register(
	"1.2.840.10045.3.1.7",
	"prime256v1",
	"NIST P-256 / prime256v1 (RFC 5480)",
);
wellKnownOidRegistry.register(
	"1.3.132.0.34",
	"secp384r1",
	"NIST P-384 / secp384r1 (RFC 5480)",
);
wellKnownOidRegistry.register(
	"1.3.132.0.35",
	"secp521r1",
	"NIST P-521 / secp521r1 (RFC 5480)",
);

// ── X.509 extensions (RFC 5280) ───────────────────────────────────────────────
wellKnownOidRegistry.register("2.5.29.15", "keyUsage", "Key Usage (RFC 5280)");
wellKnownOidRegistry.register(
	"2.5.29.17",
	"subjectAltName",
	"Subject Alternative Name (RFC 5280)",
);
wellKnownOidRegistry.register(
	"2.5.29.18",
	"issuerAltName",
	"Issuer Alternative Name (RFC 5280)",
);
wellKnownOidRegistry.register(
	"2.5.29.19",
	"basicConstraints",
	"Basic Constraints (RFC 5280)",
);
wellKnownOidRegistry.register(
	"2.5.29.14",
	"subjectKeyIdentifier",
	"Subject Key Identifier (RFC 5280)",
);
wellKnownOidRegistry.register(
	"2.5.29.35",
	"authorityKeyIdentifier",
	"Authority Key Identifier (RFC 5280)",
);
wellKnownOidRegistry.register(
	"2.5.29.31",
	"cRLDistributionPoints",
	"CRL Distribution Points (RFC 5280)",
);
wellKnownOidRegistry.register(
	"2.5.29.32",
	"certificatePolicies",
	"Certificate Policies (RFC 5280)",
);
wellKnownOidRegistry.register(
	"2.5.29.37",
	"extKeyUsage",
	"Extended Key Usage (RFC 5280)",
);
wellKnownOidRegistry.register(
	"1.3.6.1.5.5.7.1.1",
	"authorityInfoAccess",
	"Authority Information Access (RFC 5280)",
);
wellKnownOidRegistry.register(
	"2.5.29.9",
	"subjectDirectoryAttributes",
	"Subject Directory Attributes (RFC 5280)",
);
wellKnownOidRegistry.register(
	"2.5.29.30",
	"nameConstraints",
	"Name Constraints (RFC 5280)",
);
wellKnownOidRegistry.register(
	"2.5.29.33",
	"policyMappings",
	"Policy Mappings (RFC 5280)",
);
wellKnownOidRegistry.register(
	"2.5.29.36",
	"policyConstraints",
	"Policy Constraints (RFC 5280)",
);
wellKnownOidRegistry.register(
	"2.5.29.54",
	"inhibitAnyPolicy",
	"Inhibit anyPolicy (RFC 5280)",
);

// ── PKIX access methods and extended key usage (RFC 5280) ─────────────────────
wellKnownOidRegistry.register(
	"1.3.6.1.5.5.7.48.1",
	"id-ad-ocsp",
	"OCSP access method (RFC 5280)",
);
wellKnownOidRegistry.register(
	"1.3.6.1.5.5.7.48.2",
	"id-ad-caIssuers",
	"CA Issuers access method (RFC 5280)",
);
wellKnownOidRegistry.register(
	"1.3.6.1.5.5.7.3.1",
	"id-kp-serverAuth",
	"TLS server authentication (RFC 5280)",
);
wellKnownOidRegistry.register(
	"1.3.6.1.5.5.7.3.2",
	"id-kp-clientAuth",
	"TLS client authentication (RFC 5280)",
);
wellKnownOidRegistry.register(
	"1.3.6.1.5.5.7.3.3",
	"id-kp-codeSigning",
	"Code signing (RFC 5280)",
);
wellKnownOidRegistry.register(
	"1.3.6.1.5.5.7.3.4",
	"id-kp-emailProtection",
	"Email protection (RFC 5280)",
);
wellKnownOidRegistry.register(
	"1.3.6.1.5.5.7.3.8",
	"id-kp-timeStamping",
	"Time stamping (RFC 5280)",
);
wellKnownOidRegistry.register(
	"1.3.6.1.5.5.7.3.9",
	"id-kp-OCSPSigning",
	"OCSP signing (RFC 5280)",
);

// ── X.500 attribute types (X.520, RFC 4519) ───────────────────────────────────
wellKnownOidRegistry.register("2.5.4.3", "commonName", "Common Name (X.520)");
wellKnownOidRegistry.register("2.5.4.4", "surname", "Surname (X.520)");
wellKnownOidRegistry.register("2.5.4.6", "countryName", "Country Name (X.520)");
wellKnownOidRegistry.register(
	"2.5.4.7",
	"localityName",
	"Locality Name (X.520)",
);
wellKnownOidRegistry.register(
	"2.5.4.8",
	"stateOrProvinceName",
	"State or Province Name (X.520)",
);
wellKnownOidRegistry.register(
	"2.5.4.9",
	"streetAddress",
	"Street Address (X.520)",
);
wellKnownOidRegistry.register(
	"2.5.4.10",
	"organizationName",
	"Organization Name (X.520)",
);
wellKnownOidRegistry.register(
	"2.5.4.11",
	"organizationalUnitName",
	"Organizational Unit Name (X.520)",
);
wellKnownOidRegistry.register("2.5.4.12", "title", "Title (X.520)");
wellKnownOidRegistry.register("2.5.4.42", "givenName", "Given Name (X.520)");
wellKnownOidRegistry.register("2.5.4.43", "initials", "Initials (X.520)");
wellKnownOidRegistry.register(
	"2.5.4.44",
	"generationQualifier",
	"Generation Qualifier (X.520)",
);
wellKnownOidRegistry.register(
	"2.5.4.46",
	"dnQualifier",
	"DN Qualifier (X.520)",
);
wellKnownOidRegistry.register("2.5.4.65", "pseudonym", "Pseudonym (X.520)");
wellKnownOidRegistry.register(
	"1.2.840.113549.1.9.1",
	"emailAddress",
	"Email Address (PKCS #9)",
);
wellKnownOidRegistry.register(
	"0.9.2342.19200300.100.1.25",
	"domainComponent",
	"Domain Component (RFC 4519)",
);
wellKnownOidRegistry.register(
	"0.9.2342.19200300.100.1.1",
	"userid",
	"User ID (RFC 4519)",
);

// ── PKCS #9 (RFC 2985) ────────────────────────────────────────────────────────
wellKnownOidRegistry.register(
	"1.2.840.113549.1.9.14",
	"extensionRequest",
	"Extension Request (PKCS #9)",
);
wellKnownOidRegistry.register(
	"1.2.840.113549.1.9.20",
	"friendlyName",
	"Friendly Name (PKCS #9)",
);
wellKnownOidRegistry.register(
	"1.2.840.113549.1.9.21",
	"localKeyId",
	"Local Key ID (PKCS #9)",
);

// ── PKCS content types (RFC 5652) ─────────────────────────────────────────────
wellKnownOidRegistry.register(
	"1.2.840.113549.1.7.1",
	"id-data",
	"PKCS#7 data (RFC 5652)",
);
wellKnownOidRegistry.register(
	"1.2.840.113549.1.7.2",
	"id-signedData",
	"PKCS#7 signedData (RFC 5652)",
);
wellKnownOidRegistry.register(
	"1.2.840.113549.1.7.3",
	"id-envelopedData",
	"PKCS#7 envelopedData (RFC 5652)",
);
wellKnownOidRegistry.register(
	"1.2.840.113549.1.7.5",
	"id-digestedData",
	"PKCS#7 digestedData (RFC 5652)",
);
wellKnownOidRegistry.register(
	"1.2.840.113549.1.7.6",
	"id-encryptedData",
	"PKCS#7 encryptedData (RFC 5652)",
);

// ── PKCS#12 bag types (RFC 7292) ──────────────────────────────────────────────
wellKnownOidRegistry.register(
	"1.2.840.113549.1.12.10.1.1",
	"keyBag",
	"KeyBag (PKCS#12)",
);
wellKnownOidRegistry.register(
	"1.2.840.113549.1.12.10.1.2",
	"pkcs8ShroudedKeyBag",
	"PKCS8ShroudedKeyBag (PKCS#12)",
);
wellKnownOidRegistry.register(
	"1.2.840.113549.1.12.10.1.3",
	"certBag",
	"CertBag (PKCS#12)",
);
wellKnownOidRegistry.register(
	"1.2.840.113549.1.12.10.1.4",
	"crlBag",
	"CRLBag (PKCS#12)",
);
wellKnownOidRegistry.register(
	"1.2.840.113549.1.12.10.1.5",
	"secretBag",
	"SecretBag (PKCS#12)",
);
wellKnownOidRegistry.register(
	"1.2.840.113549.1.12.10.1.6",
	"safeContentsBag",
	"SafeContentsBag (PKCS#12)",
);
