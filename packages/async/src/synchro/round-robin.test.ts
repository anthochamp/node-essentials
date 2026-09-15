import { describe, expect, it } from "vitest";

import { RoundRobin } from "./round-robin.js";

/**
 * Runs `participants` in parallel, each taking `batches` turns, recording
 * order.
 */
async function interleave_(
	participants: number,
	batches: readonly number[],
): Promise<{ order: number[]; turns: RoundRobin }> {
	const turns = new RoundRobin(participants);
	const order: number[] = [];

	await Promise.all(
		batches.map(async (count, id) => {
			await turns.take(id);

			try {
				for (let batch = 0; batch < count; batch++) {
					order.push(id);

					if (batch < count - 1) {
						await turns.next(id);
					}
				}
			} finally {
				turns.leave(id);
			}
		}),
	);

	return { order, turns };
}

describe("RoundRobin", () => {
	it("gives every participant a turn before anyone gets a second", async () => {
		expect((await interleave_(3, [3, 3, 3])).order).toEqual([
			0, 1, 2, 0, 1, 2, 0, 1, 2,
		]);
	});

	it("never lets two participants hold a turn at once", async () => {
		const turns = new RoundRobin(4);
		let holders = 0;
		let overlaps = 0;

		await Promise.all(
			[5, 5, 5, 5].map(async (count, id) => {
				await turns.take(id);

				try {
					for (let batch = 0; batch < count; batch++) {
						holders += 1;
						if (holders > 1) {
							overlaps += 1;
						}
						// An await inside the turn: the point is that nobody else runs.
						await Promise.resolve();
						holders -= 1;

						if (batch < count - 1) {
							await turns.next(id);
						}
					}
				} finally {
					turns.leave(id);
				}
			}),
		);

		expect(overlaps).toBe(0);
	});

	// A participant stops when its own controller is satisfied, which is not
	// when its neighbours' are.
	it("carries on with the survivors when one leaves early", async () => {
		expect((await interleave_(3, [1, 3, 3])).order).toEqual([
			0, 1, 2, 1, 2, 1, 2,
		]);
	});

	it("degenerates to a plain loop for a single participant", async () => {
		expect((await interleave_(1, [4])).order).toEqual([0, 0, 0, 0]);
	});

	it("counts the turns each participant took", async () => {
		const { turns } = await interleave_(3, [3, 3, 3]);

		expect(turns.maxRounds).toBe(3);
		expect(turns.minRounds).toBe(3);
	});

	it("closes the shared window at the shortest-lived participant", async () => {
		const { turns } = await interleave_(3, [2, 5, 5]);

		expect(turns.minRounds).toBe(2);
		expect(turns.maxRounds).toBe(5);
	});

	it("reports every round as shared when all ran equally long", async () => {
		const { turns } = await interleave_(2, [4, 4]);

		expect(turns.minRounds).toBe(4);
		expect(turns.maxRounds).toBe(4);
	});

	it("rejects an empty participant set", () => {
		expect(() => new RoundRobin(0)).toThrow(RangeError);
	});
});
