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
 */
export function compileRegex(source: string): CompiledRegex {
	const pattern = parseRegex(source);
	const program = compileProgram(pattern);
	return {
		source,
		groupCount: pattern.groupCount,
		test: (input) => execProgram(program, input) !== undefined,
		exec: (input) => execProgram(program, input),
	};
}
