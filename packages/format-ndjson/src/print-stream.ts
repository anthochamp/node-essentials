import { EncodeStream } from "@ac-kit/format-core";
import type { JsonValue } from "type-fest";

import {
	createNdjsonLineEncoder,
	type NdjsonLineEncoderOptions,
} from "./ndjson-line-encoder.js";

export type NdjsonPrintStreamOptions = NdjsonLineEncoderOptions;

/**
 * Encodes {@link JsonValue} objects as newline-delimited JSON, one LF-terminated
 * UTF-8 chunk per input value.
 */
export class NdjsonPrintStream extends EncodeStream<JsonValue> {
	constructor(options: NdjsonPrintStreamOptions = {}) {
		super(createNdjsonLineEncoder(options));
	}
}
