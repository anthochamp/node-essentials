import { expect, it } from "vitest";

import type { Example, ExampleParams } from "./example.js";

const proven = new Set<string>();

/**
 * Registers the test that proves one example's `claim`, named by the claim.
 *
 * The test's name is the claim string itself rather than a re-typed paraphrase,
 * so a reader who sees the assertion in the failure output sees the sentence
 * the documentation publishes.
 *
 * @throws {Error} When the example declares no claim, i.e. it is an
 *   illustration and has nothing to prove.
 */
export function itProves<TParams extends ExampleParams>(
	example: Example<TParams>,
	body: () => void,
): void {
	const { claim } = example;
	if (claim === undefined) {
		throw new Error(
			`"${example.title}" declares no claim, so there is nothing to prove.`,
		);
	}
	proven.add(claim);
	it(claim, body);
}

/**
 * Asserts that every claim in `examples` was registered through
 * {@link itProves}.
 *
 * Without this, adding a claim to an example and forgetting its test publishes
 * an unproven assertion — the exact failure the claim field exists to prevent.
 * Call it once per suite file, after every {@link itProves}.
 */
export function itProvesEveryClaim(
	examples: Readonly<Record<string, Example<ExampleParams>>>,
): void {
	it("proves every claim it publishes", () => {
		const claimed = Object.values(examples)
			.map((example) => example.claim)
			.filter((claim) => claim !== undefined);

		expect([...proven].sort()).toStrictEqual([...new Set(claimed)].sort());
	});
}
