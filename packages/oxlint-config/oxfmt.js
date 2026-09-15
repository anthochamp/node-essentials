import { defineConfig } from "oxfmt";

export default defineConfig({
	// oxfmt has no per-language switch; Markdown is owned by markdownlint-cli2.
	// `.astro` is a template dialect oxfmt does not model, so formatting one
	// rewrites its frontmatter fence and template markup into invalid syntax.
	ignorePatterns: ["**/*.md", "**/*.markdown", "**/*.mdx", "**/*.astro"],
	printWidth: 80,
	jsdoc: true,
	proseWrap: "always",
	sortImports: true,
});
