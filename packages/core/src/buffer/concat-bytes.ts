import { fromVariadicArgs } from "../function/variadic-args.js";

/**
 * Concatenates any number of `Uint8Array`s into one, copying each source once —
 * linear in the total byte length. Accepts an array directly to avoid forcing a
 * spread at large call counts; the variadic overload is for the common small,
 * fixed-arity call site.
 *
 * The result is always backed by a plain `ArrayBuffer`, never a shared one, so
 * it satisfies `BufferSource` and can be handed straight to a Web API.
 */
export function concatBytes(
	arrays: readonly Uint8Array[],
): Uint8Array<ArrayBuffer>;
export function concatBytes(...arrays: Uint8Array[]): Uint8Array<ArrayBuffer>;
export function concatBytes(
	...args: [readonly Uint8Array[]] | Uint8Array[]
): Uint8Array<ArrayBuffer> {
	const arrays = fromVariadicArgs(args);

	let totalLength = 0;

	for (let index = 0; index < arrays.length; index++) {
		totalLength += arrays[index]!.length;
	}

	const result = new Uint8Array(totalLength);
	let offset = 0;

	for (let index = 0; index < arrays.length; index++) {
		const array = arrays[index]!;
		result.set(array, offset);
		offset += array.length;
	}

	return result;
}
