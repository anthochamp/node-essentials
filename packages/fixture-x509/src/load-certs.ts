/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { resolveFixtureDir } from "./paths.js";

export interface CertFile {
	readonly name: string;
	readonly source: "openssl" | "nist-pkits" | "bc-java" | "pyca-gutmann";
	readonly der: Uint8Array;
}

function extractCertsFromPem(pem: string): Uint8Array[] {
	const certs: Uint8Array[] = [];
	const re =
		/-----BEGIN CERTIFICATE-----\r?\n([\s\S]+?)\r?\n-----END CERTIFICATE-----/g;
	let match: RegExpExecArray | null;

	while ((match = re.exec(pem)) !== null) {
		const base64 = match[1]!.replace(/\s/g, "");
		certs.push(new Uint8Array(Buffer.from(base64, "base64")));
	}

	return certs;
}

/**
 * Walks `dir` (recursively — several corpora nest certs several directories
 * deep) and appends every `.pem`/`.der`/`.crt`/`.cer` file it finds to `out`.
 *
 * Whether a file is parsed as PEM is decided by its _content_ (does it contain
 * a `-----BEGIN ` armor marker?), not its extension — some corpora use a `.crt`
 * extension for PEM-armored certificates, and feeding that ASCII-armor text to
 * the DER decoder as if it were already raw binary would be a real decode
 * failure, not a legitimate rejection. A PEM file armoring something other than
 * a certificate (a private key, CSR, CRL, ...) contributes zero entries —
 * `extractCertsFromPem` only ever extracts `CERTIFICATE`-labelled blocks —
 * rather than being pushed as fake "raw DER" (its own armor text).
 */
function loadCertsFromDir(
	dir: string,
	source: CertFile["source"],
	out: CertFile[],
	excludeDirs: readonly string[] = [],
): void {
	const entries = readdirSync(dir, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.filter((entry) =>
			[".pem", ".der", ".crt", ".cer"].some((ext) => entry.name.endsWith(ext)),
		)
		.map((entry) => join(entry.parentPath, entry.name))
		.filter(
			(full) =>
				!excludeDirs.some((excluded) =>
					relative(dir, full).startsWith(`${excluded}/`),
				),
		)
		.sort();

	for (const full of entries) {
		const name = relative(dir, full);
		const raw = readFileSync(full);
		// PEM armor is pure ASCII; latin1 maps every byte to one code point, so
		// this can never throw on genuinely binary DER content.
		const asLatin1 = raw.toString("latin1");

		if (asLatin1.includes("-----BEGIN ")) {
			const certs = extractCertsFromPem(asLatin1);

			for (const [index, der] of certs.entries()) {
				out.push({
					name: certs.length > 1 ? `${name}[${index}]` : name,
					source,
					der,
				});
			}
		} else {
			out.push({ name, source, der: new Uint8Array(raw) });
		}
	}
}

/**
 * Loads all DER-encoded X.509 certificates from NIST PKITS (405 files).
 *
 * @throws {Error} When `setup` has not been run for the `nist-pkits` fixture.
 */
export function loadNistPkitsCerts(): CertFile[] {
	const certsDir = join(resolveFixtureDir("nist-pkits"), "certs");

	return readdirSync(certsDir)
		.filter((name) => name.endsWith(".crt"))
		.sort()
		.map((name) => ({
			name,
			source: "nist-pkits" as const,
			der: new Uint8Array(readFileSync(join(certsDir, name))),
		}));
}

/**
 * Loads all DER-encoded X.509 certificates from OpenSSL's `test/certs` (PEM →
 * DER; a PEM file may contain more than one certificate).
 *
 * @throws {Error} When `setup` has not been run for the `openssl-certs`
 *   fixture.
 */
export function loadOpenSslCerts(): CertFile[] {
	const certsDir = join(resolveFixtureDir("openssl-certs"), "test", "certs");
	const results: CertFile[] = [];

	// `echdir` holds fixtures for the TLS Encrypted Client Hello extension
	// (private keys and "-----BEGIN ECHCONFIG-----"-armored configs, plus one
	// deliberately unarmored fuzz input) — no X.509 certificates at all.
	loadCertsFromDir(certsDir, "openssl", results, ["echdir"]);

	return results;
}

const OPENSSL_MALFORMED_NAME_PATTERNS = [
	"bad",
	"invalid",
	"expired",
	"revoked",
	"wrongkey",
];

/**
 * Loads OpenSSL PEM files expected to contain malformed/intentionally-bad
 * encodings.
 */
export function loadOpenSslMalformedCerts(): CertFile[] {
	return loadOpenSslCerts().filter((cert) =>
		OPENSSL_MALFORMED_NAME_PATTERNS.some((pattern) =>
			cert.name.toLowerCase().includes(pattern),
		),
	);
}

/**
 * Loads only the OpenSSL PEM files expected to be valid, well-formed
 * certificates.
 */
export function loadOpenSslValidCerts(): CertFile[] {
	const malformedPrefixes = ["bad", "invalid"];

	return loadOpenSslCerts().filter(
		(cert) =>
			!malformedPrefixes.some((prefix) =>
				cert.name.toLowerCase().startsWith(prefix),
			),
	);
}

/**
 * Loads Bouncy Castle test certificates (non-PKITS, covers EC, RSA, PQC,
 * S/MIME).
 *
 * @throws {Error} When `setup` has not been run for the `bc-java-certs`
 *   fixture.
 */
export function loadBcJavaCerts(): CertFile[] {
	const root = resolveFixtureDir("bc-java-certs");
	const dirs = [
		join(
			root,
			"pkix",
			"src",
			"test",
			"resources",
			"org",
			"bouncycastle",
			"cert",
		),
		join(
			root,
			"mail",
			"src",
			"test",
			"resources",
			"org",
			"bouncycastle",
			"mail",
			"smime",
			"test",
		),
	];
	const results: CertFile[] = [];

	for (const dir of dirs) {
		loadCertsFromDir(dir, "bc-java", results);
	}

	return results;
}

/**
 * Loads pyca/cryptography custom X.509 test vectors.
 *
 * These are the closest accessible equivalent to Peter Gutmann's "Unusual X.509
 * Certificates" pathological encoding test suite. The pyca team explicitly
 * tested against Gutmann's documented edge cases (invalid UTF-8, malformed
 * SANs, non-standard extensions, oversized fields, invalid signature
 * algorithms, etc.).
 *
 * @throws {Error} When `setup` has not been run for the `pyca-x509-custom`
 *   fixture.
 */
export function loadPycaGutmannCerts(): CertFile[] {
	const dir = join(
		resolveFixtureDir("pyca-x509-custom"),
		"vectors",
		"cryptography_vectors",
		"x509",
		"custom",
	);
	const results: CertFile[] = [];

	loadCertsFromDir(dir, "pyca-gutmann", results);

	// `crl_*` vectors in this directory are CRLs, not certificates (a
	// different ASN.1 structure entirely) — several are raw `.der`, so
	// content-sniffing can't tell them apart from a certificate the way a
	// non-CERTIFICATE PEM label can.
	return results.filter((cert) => !cert.name.startsWith("crl_"));
}

const PYCA_MALFORMED_NAME_PATTERNS = ["bad_", "invalid", "malform", "corrupt"];

/**
 * Classifies a pyca custom cert as valid (structurally correct DER) or
 * malformed.
 */
export function classifyPycaCert(cert: CertFile): "valid" | "malformed" {
	return PYCA_MALFORMED_NAME_PATTERNS.some((pattern) =>
		cert.name.toLowerCase().includes(pattern),
	)
		? "malformed"
		: "valid";
}
