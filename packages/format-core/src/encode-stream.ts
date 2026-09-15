import type { Encoder } from "./encoder.js";

/**
 * Values in, encoded chunks out — the write-side counterpart of
 * {@link DecodeStream}.
 *
 * An {@link Encoder} may return several chunks for one value so a
 * length-prefixed format can emit `[header, payload]` without copying; each is
 * enqueued separately, leaving any coalescing to the sink that eventually
 * writes them.
 *
 * `flush()` does not call the encoder's `reset()`: reset exists for a protocol
 * mode switch mid-stream, not for end of input.
 */
export class EncodeStream<Out, View = Uint8Array> extends TransformStream<
	Out,
	View
> {
	constructor(encoder: Encoder<Out, View>) {
		super({
			transform(value, controller) {
				const encoded = encoder.encode(value);
				if (Array.isArray(encoded)) {
					for (const chunk of encoded as readonly View[]) {
						controller.enqueue(chunk);
					}
				} else {
					controller.enqueue(encoded as View);
				}
			},
		});
	}
}
