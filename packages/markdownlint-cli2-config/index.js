module.exports = {
	config: require("@ac-kit/markdownlint-config"),

	noBanner: true,
	noProgress: true,
	showFound: false,
	gitignore: true,

	globs: ["**/*.{md,mdx}"],

	ignores: ["**/node_modules/**", "**/.git/**", "**/.changeset/**"],
};
