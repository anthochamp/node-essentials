import type { Encoder } from "@ac-kit/format-core";

import { encodeVlq } from "./encode-vlq.js";

/**
 * A base-128 VLQ as a streaming {@link Encoder}, the write half matching
 * {@link vlqDecoder}.
 *
 * Stateless, so one instance serves every caller and `reset` is unnecessary.
 */
export const vlqEncoder: Encoder<number> = {
	encode: encodeVlq,
};
