/**
 * A single compiled instruction — Thompson/Pike-style bytecode.
 *
 * `any` is the user-visible `.` (excludes a line terminator); `anyByte`
 * unconditionally consumes one character regardless of value and is never
 * produced from pattern syntax — {@link compileProgram} uses it only to advance
 * the implicit unanchored-scan start position.
 */
export type Instruction =
	| { readonly op: "char"; readonly char: string }
	| { readonly op: "any" }
	| { readonly op: "anyByte" }
	| {
			readonly op: "predicate";
			readonly test: (char: string) => boolean;
			readonly label: string;
	  }
	| { readonly op: "assertStart" }
	| { readonly op: "assertEnd" }
	| { readonly op: "jmp"; readonly target: number }
	| { readonly op: "split"; readonly first: number; readonly second: number }
	| { readonly op: "save"; readonly slot: number }
	| { readonly op: "match" };

/**
 * A compiled regex program: a flat instruction array plus how many capture
 * slots it uses.
 */
export interface RegexProgram {
	readonly instructions: readonly Instruction[];
	/**
	 * Number of capturing groups (slots 0/1 are the overall match, not counted
	 * here).
	 */
	readonly groupCount: number;
}
