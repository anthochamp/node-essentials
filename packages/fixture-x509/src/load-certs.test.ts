import { describe, expect, it } from "vitest";

import {
	classifyPycaCert,
	loadBcJavaCerts,
	loadNistPkitsCerts,
	loadOpenSslMalformedCerts,
	loadOpenSslValidCerts,
	loadPycaGutmannCerts,
} from "./load-certs.js";

// These assert against the real corpora fetched by `setup.ts` — per §7.12, a
// missing corpus must fail the test loudly, never skip it silently. Run
// `yarn workspace @ac-kit/fixture-x509 run setup` first.

describe("loadNistPkitsCerts", () => {
	it("loads all 405 NIST PKITS certificates", () => {
		const certs = loadNistPkitsCerts();

		expect(certs).toHaveLength(405);
		expect(certs.every((cert) => cert.source === "nist-pkits")).toBe(true);
		expect(certs.every((cert) => cert.der.length > 0)).toBe(true);
	});
});

describe("loadOpenSslValidCerts / loadOpenSslMalformedCerts", () => {
	it("loads a non-empty set of valid OpenSSL certificates", () => {
		const certs = loadOpenSslValidCerts();

		expect(certs.length).toBeGreaterThan(0);
		expect(certs.every((cert) => cert.source === "openssl")).toBe(true);
	});

	it("loads a non-empty set of malformed OpenSSL certificates", () => {
		const certs = loadOpenSslMalformedCerts();

		expect(certs.length).toBeGreaterThan(0);
	});
});

describe("loadBcJavaCerts", () => {
	it("loads certificates from both Bouncy Castle resource directories", () => {
		const certs = loadBcJavaCerts();

		expect(certs.length).toBeGreaterThan(0);
		expect(certs.every((cert) => cert.source === "bc-java")).toBe(true);
	});
});

describe("loadPycaGutmannCerts / classifyPycaCert", () => {
	it("loads a non-empty set of pyca/cryptography custom vectors", () => {
		const certs = loadPycaGutmannCerts();

		expect(certs.length).toBeGreaterThan(0);
		expect(certs.every((cert) => cert.source === "pyca-gutmann")).toBe(true);
	});

	it("classifies both valid and malformed vectors", () => {
		const certs = loadPycaGutmannCerts();
		const classifications = new Set(
			certs.map((cert) => classifyPycaCert(cert)),
		);

		expect(classifications.has("valid")).toBe(true);
		expect(classifications.has("malformed")).toBe(true);
	});
});
