import type { Instruction, RegexProgram } from "./program.js";

export interface RegexGroupMatch {
	readonly start: number;
	readonly end: number;
	readonly text: string;
}

export interface RegexMatch {
	readonly index: number;
	readonly length: number;
	readonly text: string;
	/**
	 * `groups[0]` is always the overall match; `groups[i]` is capture group `i`,
	 * or `undefined` if it didn't participate.
	 */
	readonly groups: ReadonlyArray<RegexGroupMatch | undefined>;
}

interface Thread {
	readonly pc: number;
	readonly saved: readonly number[];
}

/**
 * One run of the Pike VM: tracks which `pc`s have already been added this step,
 * to keep each step O(program size).
 */
class ThreadList {
	private readonly threads: Thread[] = [];
	private readonly visitedAt: Int32Array;
	private generation = 0;

	constructor(programLength: number) {
		this.visitedAt = new Int32Array(programLength).fill(-1);
	}

	get all(): readonly Thread[] {
		return this.threads;
	}

	reset(): void {
		this.threads.length = 0;
		this.generation++;
	}

	private hasVisited(pc: number): boolean {
		if (this.visitedAt[pc] === this.generation) return true;
		this.visitedAt[pc] = this.generation;
		return false;
	}

	/**
	 * Follows `jmp`/`split`/`save`/assertions (zero-width) until a consuming or
	 * terminal instruction is reached.
	 */
	add(
		program: RegexProgram,
		pc: number,
		saved: readonly number[],
		pos: number,
		inputLength: number,
	): void {
		if (this.hasVisited(pc)) return;

		const instruction = program.instructions[pc]!;
		switch (instruction.op) {
			case "jmp":
				this.add(program, instruction.target, saved, pos, inputLength);
				return;
			case "split":
				this.add(program, instruction.first, saved, pos, inputLength);
				this.add(program, instruction.second, saved, pos, inputLength);
				return;
			case "save": {
				const next = saved.slice();
				next[instruction.slot] = pos;
				this.add(program, pc + 1, next, pos, inputLength);
				return;
			}
			case "assertStart":
				if (pos === 0) this.add(program, pc + 1, saved, pos, inputLength);
				return;
			case "assertEnd":
				if (pos === inputLength)
					this.add(program, pc + 1, saved, pos, inputLength);
				return;
			default:
				this.threads.push({ pc, saved });
		}
	}
}

function matchesChar(instruction: Instruction, char: string): boolean {
	switch (instruction.op) {
		case "char":
			return char === instruction.char;
		case "any":
			return char !== "\n";
		case "anyByte":
			return true;
		case "predicate":
			return instruction.test(char);
		default:
			return false;
	}
}

function extractMatch(
	saved: readonly number[],
	input: string,
	groupCount: number,
): RegexMatch {
	const start = saved[0]!;
	const end = saved[1]!;
	const groups: Array<RegexGroupMatch | undefined> = [
		{ start, end, text: input.slice(start, end) },
	];
	for (let group = 1; group <= groupCount; group++) {
		const groupStart = saved[group * 2];
		const groupEnd = saved[group * 2 + 1];
		groups.push(
			groupStart === undefined ||
				groupEnd === undefined ||
				groupStart < 0 ||
				groupEnd < 0
				? undefined
				: {
						start: groupStart,
						end: groupEnd,
						text: input.slice(groupStart, groupEnd),
					},
		);
	}
	return {
		index: start,
		length: end - start,
		text: input.slice(start, end),
		groups,
	};
}

/**
 * Runs a {@link RegexProgram} against `input`, returning the leftmost match
 * (and, among threads starting at the same position, the one preferred by
 * greedy/lazy quantifier priority) or `undefined` if there is none.
 *
 * This is a Pike VM: every thread advances one input character per step in
 * lockstep, so this is O(program size × input length) with no backtracking — a
 * pathological pattern like `(a+)+b` cannot exhibit catastrophic (ReDoS)
 * behavior here the way it can in a backtracking engine.
 */
export function execProgram(
	program: RegexProgram,
	input: string,
): RegexMatch | undefined {
	const slotCount = (program.groupCount + 1) * 2;
	const inputLength = input.length;

	let clist = new ThreadList(program.instructions.length);
	let nlist = new ThreadList(program.instructions.length);
	clist.add(
		program,
		0,
		Array.from({ length: slotCount }, () => -1),
		0,
		inputLength,
	);

	let matched: readonly number[] | undefined;

	for (let pos = 0; pos <= inputLength; pos++) {
		if (clist.all.length === 0) break;
		nlist.reset();

		const threads = clist.all;
		for (const thread of threads) {
			const instruction = program.instructions[thread.pc]!;
			if (instruction.op === "match") {
				matched = thread.saved;
				break; // Lower-priority threads at this step are preempted.
			}
			if (pos < inputLength && matchesChar(instruction, input[pos]!)) {
				nlist.add(program, thread.pc + 1, thread.saved, pos + 1, inputLength);
			}
		}

		[clist, nlist] = [nlist, clist];
	}

	return matched === undefined
		? undefined
		: extractMatch(matched, input, program.groupCount);
}
