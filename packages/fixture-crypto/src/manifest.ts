/**
 * Pinned, checksummed test-vector corpora fetched by `setup.ts`.
 *
 * RFC vectors are deliberately absent here: they are few, small, and prose-
 * embedded in their RFC rather than shipped as a structured, downloadable
 * corpus, so each `crypto/*` package transcribes the ones it needs directly
 * into its own test file, citing the RFC section, instead of round-tripping
 * through a fetch step that buys no verification benefit over a literal. This
 * manifest exists for NIST CAVP and Wycheproof, which are exactly the opposite:
 * large, structured, independently-versioned corpora worth fetching once and
 * sharing across every `crypto/*` package that needs them.
 */
import type { ArchiveFixtureEntry } from "@ac-kit/fixture-util";

export type FixtureEntry = ArchiveFixtureEntry;

export const FIXTURE_MANIFEST: readonly FixtureEntry[] = [
	{
		id: "cavp-shs-byte-test-vectors",
		description:
			"NIST CAVP SHA-1/SHA-2 byte-oriented test vectors (SHAVS, FIPS 180-4)",
		url: "https://csrc.nist.gov/CSRC/media/Projects/Cryptographic-Algorithm-Validation-Program/documents/shs/shabytetestvectors.zip",
		sha256: "929ef80b7b3418aca026643f6f248815913b60e01741a44bba9e118067f4c9b8",
		extract: "zip",
	},
	{
		id: "cavp-sha3-byte-test-vectors",
		description: "NIST CAVP SHA-3 byte-oriented test vectors (FIPS 202)",
		url: "https://csrc.nist.gov/CSRC/media/Projects/Cryptographic-Algorithm-Validation-Program/documents/sha3/sha-3bytetestvectors.zip",
		sha256: "cd07701af2e47f5cc889d642528b4bf11f8b6eb55797c7307a96828ed8d8fc8c",
		extract: "zip",
	},
	{
		id: "cavp-shake-byte-test-vectors",
		description: "NIST CAVP SHAKE128/256 byte-oriented test vectors (FIPS 202)",
		url: "https://csrc.nist.gov/CSRC/media/Projects/Cryptographic-Algorithm-Validation-Program/documents/sha3/shakebytetestvectors.zip",
		sha256: "debfebc3157b3ceea002b84ca38476420389a3bf7e97dc5f53ea4689a16de4c7",
		extract: "zip",
	},
	{
		id: "wycheproof-hmac-sha256",
		description:
			"Wycheproof HMAC-SHA256 MAC test vectors, pinned to C2SP/wycheproof@dac1dd4729fd1f8dd9e1e9f3dce51d783da6c166",
		url: "https://raw.githubusercontent.com/C2SP/wycheproof/dac1dd4729fd1f8dd9e1e9f3dce51d783da6c166/testvectors_v1/hmac_sha256_test.json",
		sha256: "2d201cfa61d1bf95e6f5d07d96634b4a348b31e8eaa277ad7c8d09677b7a743f",
		extract: "raw",
	},
];
