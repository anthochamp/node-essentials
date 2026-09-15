/**
 * Which subject each package belongs to, and whether it runs anywhere.
 *
 * The site is organised by subject rather than by package, so something has to
 * hold the mapping between the two. This is it, and it is the only copy: the
 * package index page, the portability badge and the domain landing pages all
 * read from here.
 *
 * Completeness is checked against the workspace itself at build time, so a new
 * package fails the site build until somebody decides where it belongs. That is
 * deliberate — an unplaced package is one nobody browsing can find.
 */

export type DomainId =
	| "language"
	| "collections"
	| "async"
	| "math"
	| "formats"
	| "crypto"
	| "net"
	| "node"
	| "app"
	| "cmd"
	| "model"
	| "tooling";

export type Domain = {
	id: DomainId;
	/** Sidebar and heading label. */
	label: string;
	/** One sentence a reader can use to decide whether to open it. */
	blurb: string;
};

export const DOMAINS: readonly Domain[] = [
	{
		id: "language",
		label: "Language utilities",
		blurb:
			"The operations on strings, numbers, iterables and objects that the standard library leaves out.",
	},
	{
		id: "collections",
		label: "Collections & algorithms",
		blurb:
			"Data structures with predictable costs, and the algorithms that work over any shape rather than one structure.",
	},
	{
		id: "async",
		label: "Concurrency & async",
		blurb:
			"Coordinating work that overlaps in time: locks, channels, events and cancellation.",
	},
	{
		id: "math",
		label: "Mathematics",
		blurb:
			"Numbers and the things done with them — from what floating point actually guarantees to special functions and numerical calculus.",
	},
	{
		id: "formats",
		label: "Data formats",
		blurb:
			"Reading and writing the file and wire formats other people's software produces.",
	},
	{
		id: "crypto",
		label: "Cryptography",
		blurb:
			"Hashing, authentication and randomness, plus the non-cryptographic hashes that must never be confused with them.",
	},
	{
		id: "net",
		label: "Networking & protocols",
		blurb:
			"Protocol clients written against a transport boundary, so the same client runs over TCP, TLS or a test double.",
	},
	{
		id: "node",
		label: "Node.js integration",
		blurb:
			"The host-bound layer: processes, files, sockets and everything that only exists under Node.",
	},
	{
		id: "app",
		label: "Application building blocks",
		blurb:
			"Configuration, logging, reporting, terminal output and translation, for programs rather than libraries.",
	},
	{
		id: "cmd",
		label: "External programs",
		blurb:
			"Typed wrappers over command-line programs installed separately, such as git and docker.",
	},
	{
		id: "model",
		label: "Data modelling",
		blurb:
			"Descriptions of data and of charts, kept separate from anything that stores or draws them.",
	},
	{
		id: "tooling",
		label: "Project tooling",
		blurb:
			"Shared build, lint and test configuration, and the fixtures test suites read from. Of interest to contributors, not to callers.",
	},
];

export type PackageEntry = {
	domain: DomainId;
	/** `P` runs on any runtime; `H` is bound to a host, in practice Node. */
	portability: "P" | "H";
	/** One line, ~80 characters, describing what a caller gets. */
	summary: string;
};

export const PACKAGES: Readonly<Record<string, PackageEntry>> = {
	algo: {
		domain: "collections",
		portability: "P",
		summary:
			"Search, traversal, selection, grouping and set operations over any shape",
	},
	"app-config": {
		domain: "app",
		portability: "H",
		summary: "Locating, reading and resolving configuration files",
	},
	"app-i18n": {
		domain: "app",
		portability: "P",
		summary: "Message catalogues, plural selection and locale negotiation",
	},
	"app-logger": {
		domain: "app",
		portability: "H",
		summary: "Structured logging over the shared report pipeline",
	},
	"app-report": {
		domain: "app",
		portability: "P",
		summary: "The event pipeline logging and reporting both build on",
	},
	"app-system": {
		domain: "app",
		portability: "H",
		summary: "Process lifecycle, PID files, binary lookup and log rotation",
	},
	"app-terminal": {
		domain: "app",
		portability: "P",
		summary:
			"Terminal capability description, styling, glyphs and live regions",
	},
	async: {
		domain: "async",
		portability: "P",
		summary:
			"Events, mutexes, semaphores, barriers, latches, signals and channels",
	},
	"biome-config": {
		domain: "tooling",
		portability: "P",
		summary: "Shared Biome configuration",
	},
	"cmd-docker": {
		domain: "cmd",
		portability: "H",
		summary: "Typed invocation of the docker command-line program",
	},
	"cmd-git": {
		domain: "cmd",
		portability: "H",
		summary: "Typed invocation of the git command-line program",
	},
	core: {
		domain: "language",
		portability: "P",
		summary:
			"Guards, type helpers, iterables, strings, numbers, objects, time and bytes",
	},
	"crypto-hash": {
		domain: "crypto",
		portability: "P",
		summary: "MD5, SHA-1, SHA-2, SHA-3/SHAKE, BLAKE2, RIPEMD-160 and SM3",
	},
	"crypto-mac": {
		domain: "crypto",
		portability: "P",
		summary: "HMAC, CMAC, GMAC and Poly1305 message authentication",
	},
	"crypto-random": {
		domain: "crypto",
		portability: "P",
		summary: "Cryptographically secure random bytes and deterministic DRBGs",
	},
	"crypto-safe": {
		domain: "crypto",
		portability: "P",
		summary: "Constant-time comparison, selection and arithmetic",
	},
	data: {
		domain: "collections",
		portability: "P",
		summary:
			"Lists, deques, queues, heaps, sets, maps, graphs, tries and indexes",
	},
	"fixture-crypto": {
		domain: "tooling",
		portability: "H",
		summary:
			"NIST CAVP, Wycheproof and RFC known-answer vectors, for tests only",
	},
	"fixture-util": {
		domain: "tooling",
		portability: "H",
		summary: "Acquiring and caching the fixture corpora test suites read",
	},
	"fixture-x509": {
		domain: "tooling",
		portability: "H",
		summary:
			"PKITS, OpenSSL and BouncyCastle certificate corpora, for tests only",
	},
	"format-ansi": {
		domain: "formats",
		portability: "P",
		summary:
			"ANSI and xterm escape sequences: parsing, stripping, colour and hyperlinks",
	},
	"format-asn1": {
		domain: "formats",
		portability: "P",
		summary: "X.690 BER, CER, DER and PER encoding with schema-bound codecs",
	},
	"format-asn1-compiler": {
		domain: "formats",
		portability: "P",
		summary: "Turning X.680 notation into runtime ASN.1 schemas",
	},
	"format-asn1-notation": {
		domain: "formats",
		portability: "P",
		summary: "X.680 ASN.1 notation: syntax tree, parser and printer",
	},
	"format-cbor": {
		domain: "formats",
		portability: "P",
		summary: "Concise Binary Object Representation encoding and decoding",
	},
	"format-core": {
		domain: "formats",
		portability: "P",
		summary:
			"The Decoder, Encoder, Codec and streaming contracts every format shares",
	},
	"format-cron": {
		domain: "formats",
		portability: "P",
		summary: "Cron expression parsing and next-occurrence computation",
	},
	"format-css-color": {
		domain: "formats",
		portability: "P",
		summary: "CSS Color 4 parsing, printing, resolution and the 148 keywords",
	},
	"format-csv": {
		domain: "formats",
		portability: "P",
		summary: "RFC 4180 rows and streams, plus rendering a DataFrame as CSV",
	},
	"format-editorconfig": {
		domain: "formats",
		portability: "P",
		summary: "EditorConfig parsing, property resolution and text normalization",
	},
	"format-glob": {
		domain: "formats",
		portability: "P",
		summary:
			"Glob syntax tree, parser, printer and matcher, with selectable dialects",
	},
	"format-http": {
		domain: "formats",
		portability: "P",
		summary: "RFC 9110 header, field and trailer value grammar",
	},
	"format-ini": {
		domain: "formats",
		portability: "P",
		summary: "Order-preserving INI tree with span-targeted editing",
	},
	"format-json": {
		domain: "formats",
		portability: "P",
		summary: "JSON parsing and serialization",
	},
	"format-json5": {
		domain: "formats",
		portability: "P",
		summary: "JSON5 parsing and serialization",
	},
	"format-jsonc": {
		domain: "formats",
		portability: "P",
		summary: "JSON-with-comments parsing and serialization",
	},
	"format-language-tag": {
		domain: "formats",
		portability: "P",
		summary:
			"BCP 47 tag parsing and printing, with RFC 4647 lookup and filtering",
	},
	"format-markdown": {
		domain: "formats",
		portability: "P",
		summary: "GitHub Flavored Markdown rendering",
	},
	"format-monospace": {
		domain: "formats",
		portability: "P",
		summary:
			"Fixed-width layout: tables, grapheme-aware widths, truncation, spinners",
	},
	"format-ndjson": {
		domain: "formats",
		portability: "P",
		summary: "Newline-delimited JSON parsing and serialization",
	},
	"format-netstring": {
		domain: "formats",
		portability: "P",
		summary: "Netstring framing as a zero-copy codec and a TransformStream",
	},
	"format-oid": {
		domain: "formats",
		portability: "P",
		summary: "Object identifiers and their registry",
	},
	"format-po": {
		domain: "formats",
		portability: "P",
		summary:
			"GNU gettext PO and POT parsing, printing and Plural-Forms evaluation",
	},
	"format-regex": {
		domain: "formats",
		portability: "P",
		summary: "Regular expression syntax tree and a Pike virtual machine",
	},
	"format-toml": {
		domain: "formats",
		portability: "P",
		summary: "TOML parsing and serialization",
	},
	"format-varint": {
		domain: "formats",
		portability: "P",
		summary: "Base-128 variable-length integers, in number and bigint",
	},
	"format-yaml": {
		domain: "formats",
		portability: "P",
		summary: "YAML parsing and serialization",
	},
	"integration-test-util": {
		domain: "tooling",
		portability: "H",
		summary: "Subprocess and container helpers for integration suites",
	},
	"markdownlint-cli2-config": {
		domain: "tooling",
		portability: "P",
		summary: "Shared markdownlint-cli2 configuration",
	},
	"markdownlint-config": {
		domain: "tooling",
		portability: "P",
		summary: "Shared markdownlint rule set",
	},
	"math-algebra": {
		domain: "math",
		portability: "P",
		summary:
			"Algebraic structures as evidence values, and the algorithms they unlock",
	},
	"math-analysis": {
		domain: "math",
		portability: "P",
		summary:
			"Special functions, root finding, quadrature and continued fractions",
	},
	"math-color": {
		domain: "math",
		portability: "P",
		summary:
			"Colour spaces, conversions, gamut mapping and perceptual difference",
	},
	"math-combinatorics": {
		domain: "math",
		portability: "P",
		summary:
			"Factorials, binomial coefficients and permutation or subset generation",
	},
	"math-complex": {
		domain: "math",
		portability: "P",
		summary: "Complex numbers as a tuple, with their arithmetic",
	},
	"math-curves": {
		domain: "math",
		portability: "P",
		summary: "Bézier curves, splines, arc length and curve fitting",
	},
	"math-geometry": {
		domain: "math",
		portability: "P",
		summary: "Shapes, coordinate systems, angles and meshes in 2D, 3D and 4D",
	},
	"math-grid": {
		domain: "math",
		portability: "P",
		summary: "Discrete lattices: storage, packing, tiling and pixel conversion",
	},
	"math-integer": {
		domain: "math",
		portability: "P",
		summary: "Bit manipulation, GCD, modular arithmetic and primality",
	},
	"math-linear": {
		domain: "math",
		portability: "P",
		summary: "Fixed-dimension vectors, matrices and rotations",
	},
	"math-numbers": {
		domain: "math",
		portability: "P",
		summary:
			"The number tower: arbitrary-precision integers, decimals and fractions",
	},
	"math-random": {
		domain: "math",
		portability: "P",
		summary: "Fast, seedable, non-cryptographic pseudorandom generators",
	},
	"math-scalar": {
		domain: "math",
		portability: "P",
		summary:
			"What binary64 actually guarantees: error-free transforms and tolerances",
	},
	"math-signal": {
		domain: "math",
		portability: "P",
		summary: "Transforms, convolution, filters and windows",
	},
	"math-stats": {
		domain: "math",
		portability: "P",
		summary: "Descriptive statistics, distributions, inference and regression",
	},
	"model-chart": {
		domain: "model",
		portability: "P",
		summary: "PlotSpec: what a chart is, with nothing that draws one",
	},
	"model-dataset": {
		domain: "model",
		portability: "P",
		summary: "DataFrame and its schema: fields, units and number formatting",
	},
	"net-core": {
		domain: "net",
		portability: "P",
		summary: "The Transport boundary every protocol client is written against",
	},
	"net-http": {
		domain: "net",
		portability: "P",
		summary: "Fetch-API header bridging and status codes",
	},
	"net-imap": {
		domain: "net",
		portability: "P",
		summary: "IMAP client over any transport",
	},
	"net-pop3": {
		domain: "net",
		portability: "P",
		summary: "POP3 client over any transport",
	},
	"net-smtp": {
		domain: "net",
		portability: "P",
		summary: "SMTP and LMTP clients over any transport",
	},
	"net-socketmap": {
		domain: "net",
		portability: "P",
		summary: "Postfix socketmap protocol client and server",
	},
	"net-transport-node": {
		domain: "net",
		portability: "H",
		summary: "TCP, TLS, IPC and UDP transports implemented on Node sockets",
	},
	node: {
		domain: "node",
		portability: "H",
		summary: "Node built-in extensions: processes, files, streams and sockets",
	},
	"noncrypto-hash": {
		domain: "crypto",
		portability: "P",
		summary: "Fast hashes, checksums and rolling hashes — never for security",
	},
	"oxlint-config": {
		domain: "tooling",
		portability: "P",
		summary: "Shared oxlint and oxfmt configuration",
	},
	"test-util": {
		domain: "tooling",
		portability: "P",
		summary: "Assertions and generators shared across test suites",
	},
	tsconfig: {
		domain: "tooling",
		portability: "P",
		summary: "The tsconfig bases every package extends",
	},
	"typedoc-config": {
		domain: "tooling",
		portability: "P",
		summary: "Shared TypeDoc configuration",
	},
	"vitest-config": {
		domain: "tooling",
		portability: "P",
		summary: "Shared Vitest project and workspace configuration",
	},
};

// Keys only: the loaders are never called, so no package.json is bundled.
const MANIFESTS = import.meta.glob("../../../../packages/*/package.json");

const WORKSPACES = new Set(
	Object.keys(MANIFESTS).map(
		(path) => /packages\/([^/]+)\/package\.json$/.exec(path)?.[1] ?? path,
	),
);

const unplaced = [...WORKSPACES].filter((name) => !(name in PACKAGES));
if (unplaced.length > 0) {
	throw new Error(
		`Packages with no documentation domain: ${unplaced.sort().join(", ")}. Add each to PACKAGES, giving it a new DOMAINS entry if none of the existing subjects fits.`,
	);
}

const stale = Object.keys(PACKAGES).filter((name) => !WORKSPACES.has(name));
if (stale.length > 0) {
	throw new Error(
		`PACKAGES lists workspaces that no longer exist: ${stale.sort().join(", ")}.`,
	);
}

/** Every package in one domain, alphabetically. */
export function domainPackages(
	domain: DomainId,
): readonly (PackageEntry & { name: string })[] {
	return Object.entries(PACKAGES)
		.filter(([, entry]) => entry.domain === domain)
		.map(([name, entry]) => ({ name, ...entry }))
		.sort((left, right) => left.name.localeCompare(right.name));
}

/** @throws {ReferenceError} When the name is not a workspace package. */
export function packageEntry(name: string): PackageEntry {
	const entry = PACKAGES[name];
	if (entry === undefined) {
		throw new ReferenceError(`No package named "${name}".`);
	}
	return entry;
}
