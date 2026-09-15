import { PassThrough } from "node:stream";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { ByteAccumulator } from "@ac-kit/core";
import type { Codec } from "@ac-kit/format-core";
import { createNetstringCodec } from "@ac-kit/format-netstring";
import { frameLinkFromDuplex } from "@ac-kit/net-transport-node";

import {
	NETSTRING_FRAMES,
	NETSTRING_PAYLOAD,
	decodeContext,
	netstringTraffic,
} from "../format-netstring/__fixtures__/fixtures.js";

const CHUNKS = netstringTraffic(NETSTRING_FRAMES, NETSTRING_PAYLOAD);
const CONTIGUOUS = Buffer.concat(CHUNKS);

function expectDecoded(count: number): void {
	if (count !== NETSTRING_FRAMES)
		throw new Error(`expected ${NETSTRING_FRAMES} frames, got ${count}`);
}

durationCondition(
	"Framing layers — same bytes, same codec, increasing depth",
	() => {
		durationCase(
			"1. codec only (contiguous input)",
			{ tags: { kind: "js" } },
			async () => {
				const codec: Codec<Uint8Array, Uint8Array | string> =
					createNetstringCodec();
				let view = CONTIGUOUS;
				let count = 0;
				while (view.length > 0) {
					const result = codec.decode(view, decodeContext);
					if (result.status !== "decoded") break;
					count++;
					view = view.subarray(result.consumed);
				}
				expectDecoded(count);
			},
		);
		durationCase(
			"2. + ByteAccumulator (chunked input)",
			{ tags: { kind: "js" } },
			async () => {
				const codec: Codec<Uint8Array, Uint8Array | string> =
					createNetstringCodec();
				const accumulator = new ByteAccumulator(8 * 1024 * 1024);
				let count = 0;
				for (const chunk of CHUNKS) {
					accumulator.append(chunk);
					while (accumulator.buffered > 0) {
						const result = codec.decode(accumulator.view(), decodeContext);
						if (result.status !== "decoded") break;
						accumulator.consume(result.consumed);
						count++;
					}
				}
				expectDecoded(count);
			},
		);
		durationCase(
			"3. + FrameLink over a Node stream",
			{ tags: { kind: "js" } },
			async () => {
				let count = 0;
				const source = new PassThrough();
				const link = frameLinkFromDuplex<Uint8Array>(source, {
					codec: createNetstringCodec(),
					sink: () => count++,
					maxBufferSize: 8 * 1024 * 1024,
				});
				for (const chunk of CHUNKS) source.write(chunk);
				await new Promise((resolve) => setImmediate(resolve));
				link.destroy();
				expectDecoded(count);
			},
		);
	},
);
