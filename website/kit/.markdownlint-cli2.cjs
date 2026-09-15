const config = require("@ac-kit/markdownlint-config");

module.exports = {
	config: {
		...config,

		// MD033/no-inline-html: a Starlight page embeds Astro components by
		// design, and every one of them reads to this rule as inline HTML.
		MD033: false,
	},
};
