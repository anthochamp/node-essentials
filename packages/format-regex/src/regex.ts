import { type RegexLimits, regexLimits } from "./limits.js";
import { parseRegex } from "./parser.js";
import { compileProgram } from "./vm/compile.js";
import { execProgram, type RegexMatch } from "./vm/pike-vm.js";

/** A parsed and compiled pattern, ready to match repeatedly without re-parsing. */
export interface CompiledRegex {
	readonly source: string;
	readonly groupCount: number;
	test(input: string): boolean;
	exec(input: string): RegexMatch | undefined;
}

/**
 * Parses and compiles `source` — the Lexer → AST → Codec pipeline end to end.
 *
 * @example
 * 	```ts
 * 	const re = compileRegex("(\\d+)-(\\d+)");
 * 	re.exec("pages 10-20"); // { index: 6, length: 5, text: "10-20", groups: [...] }
 * 	```;
 *
 * @throws {RegexLimitExceededError} If the compiled program outgrows
 *   {@link RegexLimits.maxProgramSize}. The returned matcher throws the same
 *   error if a run outgrows {@link RegexLimits.maxSteps}.
 */
export function compileRegex(
	source: string,
	limits?: RegexLimits,
): CompiledRegex {
	const pattern = parseRegex(source);
	// Resolved once, not per call: the matcher closes over the step ceiling
	// rather than over the options object it came from.
	const { maxProgramSize, maxSteps } = regexLimits(limits);
	const program = compileProgram(pattern, maxProgramSize);

	return {
		source,
		groupCount: pattern.groupCount,
		test: (input) => execProgram(program, input, maxSteps) !== undefined,
		exec: (input) => execProgram(program, input, maxSteps),
	};
}
