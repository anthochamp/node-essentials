module.exports = {
	default: true,

	// MD013/line-length
	// Line length : https://github.com/DavidAnson/markdownlint/blob/v0.35.0/doc/md013.md
	MD013: false,

	// MD024/no-duplicate-heading
	// No duplicate headings : https://github.com/DavidAnson/markdownlint/blob/v0.38.0/doc/md024.md
	MD024: {
		siblings_only: true,
	},

	// MD060/table-column-style
	// Table column style : https://github.com/DavidAnson/markdownlint/blob/v0.41.1/doc/md060.md
	MD060: false,
};
