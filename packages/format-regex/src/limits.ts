/**
 * Bounds on what a pattern may cost to compile and to run.
 *
 * The Pike VM gives an unconditional linear _time_ guarantee, but linear in a
 * program the pattern itself sizes: `a{1,200000}` expands to one instruction
 * per repetition before a single character is read. These bounds are the
 * matching _space_ guarantee, and they are what makes it safe to compile a
 * pattern that arrived from outside the program.
 */
export type RegexLimits = {
	/**
	 * Most instructions a compiled program may hold.
	 *
	 * Bounds compile-time memory. Counted bounded quantifiers (`{m,n}`) are the
	 * construct that reaches it, since each repetition emits its own copy.
	 */
	readonly maxProgramSize?: number;

	/**
	 * Most thread activations one {@link execProgram} call may perform.
	 *
	 * Bounds run-time work, which grows as program size × input length even
	 * though neither factor alone is unbounded.
	 */
	readonly maxSteps?: number;
};

/**
 * Defaults, chosen so no hand-written pattern over a realistic input reaches
 * them: 64 Ki instructions is about three orders of magnitude above any regex a
 * person writes, and 16 Mi steps covers a 100-instruction program over a 100 Ki
 * character input.
 */
export const DEFAULT_REGEX_LIMITS: Required<RegexLimits> = {
	maxProgramSize: 65_536,
	maxSteps: 16_777_216,
};

/** Which bound a {@link RegexLimitExceededError} reports. */
export type RegexLimitKind = "programSize" | "steps";

/** Thrown when a pattern exceeds one of the {@link RegexLimits}. */
export class RegexLimitExceededError extends Error {
	constructor(
		readonly kind: RegexLimitKind,
		readonly limit: number,
	) {
		super(
			kind === "programSize"
				? `Compiled regex program exceeds ${limit} instructions`
				: `Regex execution exceeded ${limit} steps`,
		);
		this.name = "RegexLimitExceededError";
	}
}

/** Fills in the unset bounds from {@link DEFAULT_REGEX_LIMITS}. */
export function regexLimits(limits?: RegexLimits): Required<RegexLimits> {
	return {
		maxProgramSize:
			limits?.maxProgramSize ?? DEFAULT_REGEX_LIMITS.maxProgramSize,
		maxSteps: limits?.maxSteps ?? DEFAULT_REGEX_LIMITS.maxSteps,
	};
}
