/**
 * Pinned, verified X.509 certificate corpora fetched by `setup.ts`.
 *
 * Used as decode/re-encode conformance input for `format/asn1`'s DER codec —
 * see its `der/__fixtures__/conformance.test.ts`. Two acquisition strategies,
 * per source:
 *
 * - **`archive`**: NIST PKITS is a plain published zip, so it is fetched and
 *   verified like any other file — pinned URL, SHA-256 digest, extract.
 * - **`git-sparse`**: OpenSSL, Bouncy Castle and pyca/cryptography are
 *   git-hosted, and only a handful of certificate directories out of each
 *   repository are needed. GitHub's archive/zip endpoint cannot scope to a
 *   subdirectory — the whole repository would have to be downloaded to reach a
 *   few megabytes of certs. A `--filter=blob:none` fetch of one pinned commit
 *   followed by a cone-mode sparse checkout of just the needed paths gets the
 *   same bytes for a fraction of the transfer (measured: 2-15 MiB per corpus
 *   here, versus the full repositories, which run from tens to hundreds of
 *   MiB). The pinned commit SHA is itself the integrity check — git's object
 *   store is content-addressed, so a checked-out commit cannot silently contain
 *   different bytes than what that SHA names; `setup.ts` still asserts the
 *   checked-out `HEAD` matches as defense in depth.
 */

import type {
	ArchiveFixtureEntry,
	GitSparseFixtureEntry,
} from "@ac-kit/fixture-util";

export type FixtureEntry =
	| ({ readonly kind: "archive" } & ArchiveFixtureEntry)
	| ({ readonly kind: "git-sparse" } & GitSparseFixtureEntry);

export const FIXTURE_MANIFEST: readonly FixtureEntry[] = [
	{
		id: "nist-pkits",
		description:
			"NIST PKITS — 405 DER-encoded X.509 certificates (FIPS 201-adjacent path-validation test suite)",
		kind: "archive",
		url: "https://csrc.nist.gov/CSRC/media/Projects/PKI-Testing/documents/PKITS_data.zip",
		sha256: "592f66030d2eff80fced7ad022e197d96b7ee4ccce7da9df9c9b2007b1665665",
		extract: "zip",
	},
	{
		id: "openssl-certs",
		description:
			"OpenSSL test/certs — valid and intentionally-malformed X.509 test certificates",
		kind: "git-sparse",
		url: "https://github.com/openssl/openssl.git",
		commit: "17bf6c48ea8a6af1cb90f2f2aab4bb4b9e2adfc5",
		sparsePaths: ["test/certs"],
	},
	{
		id: "bc-java-certs",
		description:
			"Bouncy Castle Java — non-PKITS test certificates (EC, RSA, PQC, S/MIME)",
		kind: "git-sparse",
		url: "https://github.com/bcgit/bc-java.git",
		commit: "897c3795c9fd29b76a5aa32a5541c85966b0c79e",
		sparsePaths: [
			"pkix/src/test/resources/org/bouncycastle/cert",
			"mail/src/test/resources/org/bouncycastle/mail/smime/test",
		],
	},
	{
		id: "pyca-x509-custom",
		description:
			"pyca/cryptography custom X.509 vectors — Peter Gutmann-equivalent pathological encodings",
		kind: "git-sparse",
		url: "https://github.com/pyca/cryptography.git",
		commit: "5dbf5b1ed7f297674fa0d2e9952700d35d85f31e",
		sparsePaths: ["vectors/cryptography_vectors/x509/custom"],
	},
];
