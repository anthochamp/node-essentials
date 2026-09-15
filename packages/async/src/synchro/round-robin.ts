/**
 * Hands one turn at a time to a fixed set of participants, cyclically.
 *
 * Every participant takes a turn before any one of them takes a second, and
 * turns never overlap — the next holder is only woken once the previous one has
 * released it. A participant that finishes early leaves, and the remaining ones
 * carry on without it, still strictly one at a time.
 *
 * @example
 * 	const turns = new RoundRobin(3);
 *
 * 	async function worker(id: number, batches: number) {
 * 		await turns.take(id);
 * 		try {
 * 			for (let batch = 0; batch < batches; batch++) {
 * 				// ...do this worker's share of one round...
 * 				if (batch < batches - 1) {
 * 					await turns.next(id);
 * 				}
 * 			}
 * 		} finally {
 * 			turns.leave(id);
 * 		}
 * 	}
 */
export class RoundRobin {
	private readonly waiting = new Map<number, () => void>();
	private readonly finished = new Set<number>();
	private readonly taken: number[];

	/** Whose turn it is, or `null` when every participant has left. */
	private holder: number | null;

	/**
	 * @param participants How many fixed, 0-based participant slots to cycle
	 *   through.
	 */
	constructor(participants: number) {
		if (participants < 1) {
			throw new RangeError("RoundRobin: at least one participant");
		}

		this.taken = Array.from({ length: participants }, () => 0);
		this.holder = 0;
	}

	/**
	 * Resolves when it is this participant's turn.
	 *
	 * @param id 0-based participant index, in turn order.
	 */
	take(id: number): Promise<void> {
		if (this.holder === id) {
			this.taken[id] = (this.taken[id] ?? 0) + 1;

			return Promise.resolve();
		}

		return this.wait_(id);
	}

	/** Passes the turn on, and waits for it to come back. */
	async next(id: number): Promise<void> {
		// Registered before handing the turn on, and without `take`'s
		// already-mine short circuit: the caller holds the turn right now, so
		// checking would let it straight through without ever yielding.
		const waiting = this.wait_(id);

		this.advance_(id);

		await waiting;
	}

	private wait_(id: number): Promise<void> {
		return new Promise((resolve) => {
			this.waiting.set(id, () => {
				this.taken[id] = (this.taken[id] ?? 0) + 1;
				resolve();
			});
		});
	}

	/** Gives up this participant's turn for good. */
	leave(id: number): void {
		if (this.finished.has(id)) {
			return;
		}

		this.finished.add(id);
		this.waiting.delete(id);
		this.advance_(id);
	}

	/** Turns taken by the participant that took the most. */
	get maxRounds(): number {
		return Math.max(...this.taken);
	}

	/**
	 * Turns taken by the participant that took the fewest.
	 *
	 * The rounds up to this point are the only ones every participant took part
	 * in: past it, at least one participant had already left, so whatever ran the
	 * turn alongside it did so under different conditions (less contention,
	 * different concurrent load).
	 */
	get minRounds(): number {
		return Math.min(...this.taken);
	}

	private advance_(id: number): void {
		if (this.holder !== id) {
			return;
		}

		for (let step = 1; step <= this.taken.length; step++) {
			const candidate = (id + step) % this.taken.length;

			if (!this.finished.has(candidate)) {
				this.holder = candidate;
				this.wake_(candidate);
				return;
			}
		}

		this.holder = null;
	}

	private wake_(id: number): void {
		const resume = this.waiting.get(id);

		if (resume === undefined) {
			// Not waiting yet; `take` will see the turn is already theirs.
			return;
		}

		this.waiting.delete(id);
		resume();
	}
}
