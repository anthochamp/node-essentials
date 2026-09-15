import type { Encoder } from "@ac-kit/format-core";

import { encodeBigVlq } from "./encode-big-vlq.js";

/**
 * A base-128 VLQ as a streaming {@link Encoder} taking `bigint`, the write half
 * matching {@link bigVlqDecoder}.
 *
 * Stateless, so one instance serves every caller and `reset` is unnecessary.
 */
export const bigVlqEncoder: Encoder<bigint> = {
	encode: encodeBigVlq,
};
