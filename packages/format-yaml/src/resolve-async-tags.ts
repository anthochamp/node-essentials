import { isPromise } from "@ac-kit/core";
import * as yaml from "yaml";

/**
 * Settles every `Promise` an async custom tag left behind in `node`.
 *
 * A `ScalarTag.resolve` declared `async` hands the composer a `Promise`, which
 * it stores as the scalar's value verbatim — so `toJS()` would serialise the
 * promise rather than what it settles to. Awaiting the tree once, between
 * composing it and reading it, is what makes an async tag usable.
 *
 * Mutates `node` in place. Linear in the number of nodes; the awaits run in
 * document order, not concurrently.
 */
export async function resolveYamlAsyncTags(
	node: yaml.Node | yaml.Document | null,
): Promise<void> {
	await yaml.visitAsync(node, {
		async Scalar(_key, scalar) {
			if (isPromise(scalar.value)) {
				scalar.value = await scalar.value;
			}
		},
	});
}
