#!/usr/bin/env node
// Verifies two things a README can get wrong without anyone noticing: that every
// `@ac-kit`/`@ac-bench` symbol its examples import actually exists, and that it
// links a generated API page exactly when its manifest claims one. A README is
// the first thing a reader runs; a dead import or a 404 is the worst possible
// first impression.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const GROUPS = { packages: "@ac-kit", bench: "@ac-bench" };

const SITE_BASE = "https://anthochamp.github.io/node-essentials";

const DECLARATION =
	/^export\s+(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(?:function\s*\*?|class|const|let|var|type|interface|enum)\s+([A-Za-z_$][\w$]*)/gm;

/**
 * Every name reachable from an entry point, following `export *` re-exports.
 *
 * Walking the barrel rather than the directory matters: a symbol in an
 * underscore-prefixed module is internal, and a README pointing at one
 * advertises something a consumer cannot import.
 */
function collectExports(entryPoint, names, seen) {
	const path = resolve(entryPoint);
	if (seen.has(path) || !existsSync(path)) {
		return names;
	}
	seen.add(path);

	const text = readFileSync(path, "utf8");
	for (const [, name] of text.matchAll(DECLARATION)) {
		names.add(name);
	}
	for (const [, clause] of text.matchAll(/^export\s*\{([^}]*)\}/gm)) {
		for (const specifier of clause.split(",")) {
			const name = specifier
				.trim()
				.split(/\s+as\s+/)
				.pop()
				?.trim();
			if (name !== undefined && name.length > 0) {
				names.add(name.replace(/^type\s+/, ""));
			}
		}
	}
	for (const [, relative] of text.matchAll(
		/^export\s+(?:\*|\{[^}]*\})\s*(?:as\s+\w+\s*)?from\s*"(\.[^"]*)"/gm,
	)) {
		collectExports(
			join(dirname(path), relative.replace(/\.js$/, ".ts")),
			names,
			seen,
		);
	}
	return names;
}

/** Entry points a consumer can import, taken from the manifest's own `exports`. */
function entryPoints(packageDirectory) {
	const manifest = JSON.parse(
		readFileSync(join(packageDirectory, "package.json"), "utf8"),
	);
	const declared =
		typeof manifest.exports === "object" && manifest.exports !== null
			? Object.values(manifest.exports)
			: [manifest.main];

	return declared
		.filter((entry) => typeof entry === "string" && entry.endsWith(".ts"))
		.map((entry) => join(packageDirectory, entry));
}

const catalogue = new Map();
for (const [group, scope] of Object.entries(GROUPS)) {
	for (const directory of readdirSync(group)) {
		const packageDirectory = join(group, directory);
		if (!existsSync(join(packageDirectory, "package.json"))) {
			continue;
		}

		const names = new Set();
		const seen = new Set();
		for (const entry of entryPoints(packageDirectory)) {
			collectExports(entry, names, seen);
		}
		if (names.size > 0) {
			catalogue.set(`${scope}/${directory}`, names);
		}
	}
}

const problems = [];
for (const group of Object.keys(GROUPS)) {
	for (const directory of readdirSync(group)) {
		const readme = join(group, directory, "README.md");
		if (!existsSync(readme)) {
			continue;
		}

		const text = readFileSync(readme, "utf8");
		for (const [, clause, specifier] of text.matchAll(
			/import\s*\{([^}]*)\}\s*from\s*"((?:@ac-kit|@ac-bench)\/[\w-]+)"/g,
		)) {
			const exported = catalogue.get(specifier);
			if (exported === undefined) {
				// Config-only packages ship no TypeScript, so there is nothing to check.
				continue;
			}
			for (const raw of clause.split(",")) {
				const name = raw
					.trim()
					.replace(/^type\s+/, "")
					.split(/\s+as\s+/)[0];
				if (name.length > 0 && !exported.has(name)) {
					problems.push(`${readme}: ${specifier} does not export "${name}"`);
				}
			}
		}

		// `homepage` is what decides whether the site generates an API page, so a
		// README may link to one exactly when its manifest claims one.
		const manifestPath = join(group, directory, "package.json");
		if (!existsSync(manifestPath)) {
			continue;
		}

		const apiPage = `${SITE_BASE}/api/${directory}/`;
		const claimed =
			JSON.parse(readFileSync(manifestPath, "utf8")).homepage === apiPage;
		const linked = text.includes(apiPage);

		if (linked && !claimed) {
			problems.push(
				`${readme}: links an API page its package.json homepage does not claim`,
			);
		}
		if (claimed && !linked) {
			problems.push(
				`${readme}: package.json claims an API page the README never links to`,
			);
		}
	}
}

if (problems.length > 0) {
	console.error("README and manifest disagree:\n");
	for (const problem of problems) {
		console.error(`  ${problem}`);
	}
	process.exit(1);
}

console.log(
	"Every README imports a real symbol and links only pages that exist.",
);
