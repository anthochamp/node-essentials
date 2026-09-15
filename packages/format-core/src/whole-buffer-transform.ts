import { concatBytes, decodeText } from "@ac-kit/core";

/** The transformer contract accepted by `new TransformStream(...)`. */
export type StreamTransformer<I, O> = {
	transform(
		chunk: I,
		controller: TransformStreamDefaultController<O>,
	): void | PromiseLike<void>;
	flush?(
		controller: TransformStreamDefaultController<O>,
	): void | PromiseLike<void>;
};

/**
 * Transformer that buffers a whole byte stream, decodes it as UTF-8 and emits a
 * single parsed value on flush.
 *
 * Formats whose grammar spans the entire document — JSON, YAML, TOML, INI —
 * cannot emit before the input ends, so they all share this shape. This is a
 * fourth consumption pattern alongside {@link DecodeDriver}/`decodeAll`/
 * `DecodeStream`: it exists for grammars with no incremental decode capability
 * at all, not just ones a caller chose not to stream.
 *
 * @param parse Converts the decoded document into a value.
 * @param label Format name, used in the wrapped error message.
 * @returns A transformer for `new TransformStream(...)`.
 */
export function wholeTextParseTransformer<T>(
	parse: (text: string) => T,
	label: string,
): StreamTransformer<Uint8Array, T> {
	const chunks: Uint8Array[] = [];
	return {
		transform(chunk) {
			chunks.push(chunk);
		},
		flush(controller) {
			const source = decodeText(concatBytes(chunks), "utf-8");
			try {
				controller.enqueue(parse(source));
			} catch (error) {
				throw new Error(`parse ${label}`, { cause: error });
			}
		},
	};
}

/**
 * Transformer that prints each incoming value as a UTF-8 encoded chunk.
 *
 * @param print Converts a value into its textual form.
 * @param label Format name, used in the wrapped error message.
 * @returns A transformer for `new TransformStream(...)`.
 */
export function textPrintTransformer<T>(
	print: (value: T) => string,
	label: string,
): StreamTransformer<T, Uint8Array> {
	const encoder = new TextEncoder();
	return {
		transform(value, controller) {
			try {
				controller.enqueue(encoder.encode(print(value)));
			} catch (error) {
				throw new Error(`print ${label}`, { cause: error });
			}
		},
	};
}
