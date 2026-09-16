import { defineConfig } from "oxfmt";

export default defineConfig({
	ignorePatterns: [
		// Markdown is owned by markdownlint-cli2.
		"**/*.md",
		"**/*.markdown",
		// `.astro` is a template dialect oxfmt does not model, so formatting one
		// rewrites its frontmatter fence and template markup into invalid syntax.
		"**/*.mdx",
		"**/*.astro",
		// oxfmt does not respect existing YAML formatting rules yet.
		"**/*.yml",
		"**/*.yaml",
	],
	printWidth: 80,
	jsdoc: true,
	proseWrap: "always",
	sortImports: true,
});
