import type { Instruction, RegexProgram } from "@ac-kit/format-regex";
import { RegexLimitExceededError } from "@ac-kit/format-regex";

import {
	type CharSet,
	charSetKey,
	charSetPredicate,
	differenceCharSets,
	intersectCharSets,
	isEmptyCharSet,
	partitionAlphabet,
} from "./_char-set.js";
import { GlobLimitExceededError } from "./limits.js";

/**
 * One edge of the automaton. `save` is zero-width and records an input offset,
 * which is how a numeric range keeps the capture-and-check trick the native
 * `RegExp` backend uses rather than inventing a second semantics for it.
 */
type NfaTransition =
	| { readonly kind: "consume"; readonly set: CharSet; readonly target: number }
	| { readonly kind: "epsilon"; readonly target: number }
	| { readonly kind: "save"; readonly slot: number; readonly target: number };

/** A sub-automaton with one entry and one exit, in some {@link NfaBuilder}. */
export type NfaFragment = { readonly start: number; readonly accept: number };

/** Never matches: the only instruction a dead automaton state can carry. */
const NEVER_ = (): boolean => false;

/**
 * A Thompson-construction NFA over {@link CharSet} edges.
 *
 * Built here rather than as `@ac-kit/format-regex` source text for one reason:
 * `!(…)` is a complement, `format-regex` has no lookaround, and complementing
 * needs the automaton itself — a determinised one — not a pattern string. Every
 * other construct could have gone through the regex parser, and keeping them in
 * the same representation is what lets a complement be nested inside another.
 *
 * Fragments share one state array, and each fragment is consumed by at most one
 * combinator: a combinator adds edges to a fragment's accept state, so reusing
 * one would silently merge two automata.
 */
export class NfaBuilder {
	private readonly states: NfaTransition[][] = [];

	get stateCount(): number {
		return this.states.length;
	}

	addState(): number {
		this.states.push([]);
		return this.states.length - 1;
	}

	private link(from: number, transition: NfaTransition): void {
		this.states[from]!.push(transition);
	}

	/** Matches the empty string. */
	empty(): NfaFragment {
		const start = this.addState();
		const accept = this.addState();
		this.link(start, { kind: "epsilon", target: accept });
		return { start, accept };
	}

	/** Matches exactly one code unit drawn from `set`. */
	consume(set: CharSet): NfaFragment {
		const start = this.addState();
		const accept = this.addState();
		if (!isEmptyCharSet(set)) {
			this.link(start, { kind: "consume", set, target: accept });
		}
		return { start, accept };
	}

	/** Records the current offset in `slot`, consuming nothing. */
	save(slot: number): NfaFragment {
		const start = this.addState();
		const accept = this.addState();
		this.link(start, { kind: "save", slot, target: accept });
		return { start, accept };
	}

	concat(left: NfaFragment, right: NfaFragment): NfaFragment {
		this.link(left.accept, { kind: "epsilon", target: right.start });
		return { start: left.start, accept: right.accept };
	}

	concatAll(fragments: readonly NfaFragment[]): NfaFragment {
		if (fragments.length === 0) {
			return this.empty();
		}
		return fragments.reduce((left, right) => this.concat(left, right));
	}

	alternate(fragments: readonly NfaFragment[]): NfaFragment {
		const start = this.addState();
		const accept = this.addState();
		for (const fragment of fragments) {
			this.link(start, { kind: "epsilon", target: fragment.start });
			this.link(fragment.accept, { kind: "epsilon", target: accept });
		}
		return { start, accept };
	}

	optional(body: NfaFragment): NfaFragment {
		const start = this.addState();
		const accept = this.addState();
		this.link(start, { kind: "epsilon", target: body.start });
		this.link(start, { kind: "epsilon", target: accept });
		this.link(body.accept, { kind: "epsilon", target: accept });
		return { start, accept };
	}

	star(body: NfaFragment): NfaFragment {
		const start = this.addState();
		const accept = this.addState();
		this.link(start, { kind: "epsilon", target: body.start });
		this.link(start, { kind: "epsilon", target: accept });
		this.link(body.accept, { kind: "epsilon", target: body.start });
		this.link(body.accept, { kind: "epsilon", target: accept });
		return { start, accept };
	}

	plus(body: NfaFragment): NfaFragment {
		const start = this.addState();
		const accept = this.addState();
		this.link(start, { kind: "epsilon", target: body.start });
		this.link(body.accept, { kind: "epsilon", target: body.start });
		this.link(body.accept, { kind: "epsilon", target: accept });
		return { start, accept };
	}

	/**
	 * `fragment`, with `excluded` barred from whatever character it consumes
	 * first — the automaton spelling of a `(?!…)` guard on one character.
	 *
	 * Only the zero-width frontier is duplicated: the epsilon closure of the
	 * entry, whose consuming edges are narrowed and then land back in the
	 * original states. So this costs the size of that closure, not the size of
	 * the fragment, and stacking one guard per path segment stays linear instead
	 * of doubling each time.
	 */
	excludeFirstChar(fragment: NfaFragment, excluded: CharSet): NfaFragment {
		const closure = this.epsilonClosure([fragment.start]);
		const clones = new Map<number, number>();
		for (const state of closure) {
			clones.set(state, this.addState());
		}

		for (const state of closure) {
			const clone = clones.get(state)!;
			for (const transition of this.states[state]!) {
				if (transition.kind === "consume") {
					const narrowed = differenceCharSets(transition.set, excluded);
					if (!isEmptyCharSet(narrowed)) {
						this.link(clone, {
							kind: "consume",
							set: narrowed,
							target: transition.target,
						});
					}
					continue;
				}
				// Zero-width, so the target is in the closure and has a clone.
				this.link(clone, {
					...transition,
					target: clones.get(transition.target)!,
				});
			}
		}

		const acceptClone = clones.get(fragment.accept);
		if (acceptClone !== undefined) {
			this.link(acceptClone, { kind: "epsilon", target: fragment.accept });
		}

		return { start: clones.get(fragment.start)!, accept: fragment.accept };
	}

	/**
	 * Everything over `universe` that `fragment` does _not_ match.
	 *
	 * Subset construction to a total DFA, then the accepting states are swapped.
	 * That is the standard route and the only exact one without lookaround, and
	 * its cost is the reason {@link GlobLimits.maxComplementStates} exists:
	 * determinising is exponential in the worst case, and `!(*a*b*c*…)` is that
	 * case exactly.
	 *
	 * O(states × alphabet atoms) in the size of the determinised automaton, and
	 * the atom count is bounded by twice the number of distinct class boundaries
	 * in the body.
	 */
	complement(
		fragment: NfaFragment,
		universe: CharSet,
		maxStates: number,
	): NfaFragment {
		const reachable = this.reachableFrom(fragment.start);
		const alphabet = partitionAlphabet(
			[...reachable]
				.flatMap((state) => this.states[state]!)
				.filter((transition) => transition.kind === "consume")
				.map((transition) => transition.set),
			universe,
		);

		const subsets = new Map<string, number>();
		const order: number[][] = [];
		const accepting: boolean[] = [];
		const transitions: number[][] = [];

		const intern = (subset: readonly number[]): number => {
			const key = subset.join(",");
			const existing = subsets.get(key);
			if (existing !== undefined) {
				return existing;
			}
			if (order.length >= maxStates) {
				throw new GlobLimitExceededError("complementStates", maxStates);
			}
			const id = order.length;
			subsets.set(key, id);
			order.push([...subset]);
			accepting.push(subset.includes(fragment.accept));
			transitions.push([]);
			return id;
		};

		const startId = intern(
			[...this.epsilonClosure([fragment.start])].sort(compareNumbers_),
		);

		for (let id = 0; id < order.length; id++) {
			const subset = order[id]!;
			for (let atom = 0; atom < alphabet.length; atom++) {
				const moved: number[] = [];
				for (const state of subset) {
					for (const transition of this.states[state]!) {
						if (
							transition.kind === "consume" &&
							!isEmptyCharSet(
								intersectCharSets(transition.set, alphabet[atom]!),
							)
						) {
							moved.push(transition.target);
						}
					}
				}
				const next = [...this.epsilonClosure(moved)].sort(compareNumbers_);
				transitions[id]![atom] = intern(next);
			}
		}

		const nfaStates = order.map(() => this.addState());
		const accept = this.addState();
		for (let id = 0; id < order.length; id++) {
			for (let atom = 0; atom < alphabet.length; atom++) {
				this.link(nfaStates[id]!, {
					kind: "consume",
					set: alphabet[atom]!,
					target: nfaStates[transitions[id]![atom]!]!,
				});
			}
			// The swap: a subset that did not accept the body accepts its complement.
			if (!accepting[id]) {
				this.link(nfaStates[id]!, { kind: "epsilon", target: accept });
			}
		}

		return { start: nfaStates[startId]!, accept };
	}

	/** States reachable without consuming input. */
	private epsilonClosure(seeds: readonly number[]): Set<number> {
		const closure = new Set<number>();
		const pending = [...seeds];
		while (pending.length > 0) {
			const state = pending.pop()!;
			if (closure.has(state)) {
				continue;
			}
			closure.add(state);
			for (const transition of this.states[state]!) {
				if (transition.kind !== "consume") {
					pending.push(transition.target);
				}
			}
		}
		return closure;
	}

	private reachableFrom(start: number): Set<number> {
		const seen = new Set<number>();
		const pending = [start];
		while (pending.length > 0) {
			const state = pending.pop()!;
			if (seen.has(state)) {
				continue;
			}
			seen.add(state);
			for (const transition of this.states[state]!) {
				pending.push(transition.target);
			}
		}
		return seen;
	}

	/**
	 * Lowers the automaton to a `@ac-kit/format-regex` program, anchored at both
	 * ends.
	 *
	 * Anchored rather than scanning because a glob always matches a whole path:
	 * the VM seeds one thread at offset 0, and the exit asserts end of input, so
	 * a returned match is a full match by construction.
	 *
	 * O(states + edges) instructions.
	 *
	 * @throws {RegexLimitExceededError} If the program outgrows `maxProgramSize`.
	 */
	toProgram(
		fragment: NfaFragment,
		slotCount: number,
		maxProgramSize: number,
	): RegexProgram {
		const instructions: Instruction[] = [];
		const pendingTargets: { at: number; state: number }[] = [];
		const pendingDone: number[] = [];
		const labels = new Map<number, number>();

		const emit = (instruction: Instruction): number => {
			if (instructions.length >= maxProgramSize) {
				throw new RegexLimitExceededError("programSize", maxProgramSize);
			}
			instructions.push(instruction);
			return instructions.length - 1;
		};
		const emitJumpToState = (state: number): void => {
			pendingTargets.push({ at: emit({ op: "jmp", target: -1 }), state });
		};
		const emitJumpToDone = (): void => {
			pendingDone.push(emit({ op: "jmp", target: -1 }));
		};

		emit({ op: "save", slot: 0 });
		const entry = emit({ op: "jmp", target: -1 });
		pendingTargets.push({ at: entry, state: fragment.start });

		const reachable = [...this.reachableFrom(fragment.start)].sort(
			compareNumbers_,
		);
		for (const state of reachable) {
			labels.set(state, instructions.length);

			const outgoing = this.states[state]!;
			const alternativeCount =
				outgoing.length + (state === fragment.accept ? 1 : 0);
			if (alternativeCount === 0) {
				emit({ op: "predicate", test: NEVER_, label: "dead" });
				continue;
			}

			let emitted = 0;
			const emitAlternative = (index: number): void => {
				if (index === outgoing.length) {
					emitJumpToDone();
					return;
				}
				const transition = outgoing[index]!;
				if (transition.kind === "consume") {
					emit({
						op: "predicate",
						test: charSetPredicate(transition.set),
						label: charSetKey(transition.set),
					});
				} else if (transition.kind === "save") {
					emit({ op: "save", slot: transition.slot });
				}
				emitJumpToState(transition.target);
			};

			while (emitted < alternativeCount - 1) {
				const splitAt = emit({ op: "split", first: -1, second: -1 });
				const first = instructions.length;
				emitAlternative(emitted);
				instructions[splitAt] = {
					op: "split",
					first,
					second: instructions.length,
				};
				emitted += 1;
			}
			emitAlternative(emitted);
		}

		const done = instructions.length;
		emit({ op: "assertEnd" });
		emit({ op: "save", slot: 1 });
		emit({ op: "match" });

		for (const pending of pendingTargets) {
			// Every pending target is a transition out of a state already walked, so
			// it was labelled in the loop above.
			instructions[pending.at] = {
				op: "jmp",
				target: labels.get(pending.state)!,
			};
		}
		for (const at of pendingDone) {
			instructions[at] = { op: "jmp", target: done };
		}

		return { instructions, groupCount: Math.max(0, slotCount / 2 - 1) };
	}
}

function compareNumbers_(left: number, right: number): number {
	return left - right;
}
