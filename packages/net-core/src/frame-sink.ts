/**
 * Receives decoded values.
 *
 * A plain callback rather than an event: a link has exactly one consumer (the
 * session above it) and this is the hottest path in the stack, so the
 * dispatcher machinery is not worth its per-value cost here. Lifecycle
 * concerns, which are rare and may have many listeners, remain events.
 *
 * @param value The decoded value.
 * @param body Present when the codec declared a streamed payload. The consumer
 *   must drain it; until it does, the transport stays paused.
 */
export type FrameSink<In> = (
	value: In,
	body?: ReadableStream<Uint8Array>,
) => void;
