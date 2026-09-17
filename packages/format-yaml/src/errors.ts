import type * as yaml from "yaml";

/** One parser diagnostic, with where in the source it applies. */
export type YamlDiagnostic = {
	/** The `yaml` error code, e.g. `BAD_INDENT` or `MISSING_CHAR`. */
	readonly code: string;
	readonly message: string;
	/** Character offsets into the source the diagnostic covers. */
	readonly startOffset: number;
	readonly endOffset: number;
	/** 1-based line, absent when `prettyErrors: false` suppressed line counting. */
	readonly line?: number;
	/** 1-based column, absent under the same condition as {@link line}. */
	readonly column?: number;
};

/**
 * Input that is not well-formed YAML, carrying every diagnostic the parser
 * produced rather than only the first.
 */
export class YamlParseError extends SyntaxError {
	readonly diagnostics: readonly YamlDiagnostic[];

	constructor(errors: readonly yaml.YAMLError[]) {
		const [first, ...rest] = errors;
		super(
			first === undefined
				? "Invalid YAML"
				: rest.length === 0
					? first.message
					: `${first.message} (and ${rest.length} further error${rest.length === 1 ? "" : "s"})`,
			{ cause: first },
		);
		this.name = "YamlParseError";
		this.diagnostics = errors.map(toDiagnostic_);
	}
}

function toDiagnostic_(error: yaml.YAMLError): YamlDiagnostic {
	const [startOffset, endOffset] = error.pos;
	const start = error.linePos?.[0];
	return {
		code: error.code,
		message: error.message,
		startOffset,
		endOffset,
		...(start === undefined ? {} : { line: start.line, column: start.col }),
	};
}
