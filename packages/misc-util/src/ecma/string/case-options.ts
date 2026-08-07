import type { Pattern } from "../regexp/types.js";

export type StringCaseOptions = {
	/** Regex pattern matching characters that act as word delimiters. Default: `[_.\\- ]` */
	separators?: Pattern;
	/** Regex pattern matching non-separator characters to keep when following a separator. Default: `.` */
	keep?: Pattern;
};

export const STRING_CASE_DEFAULT_OPTIONS: Required<StringCaseOptions> = {
	separators: "[_.\\- ]",
	keep: ".",
};
