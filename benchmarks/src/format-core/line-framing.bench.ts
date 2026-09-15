import { once } from "node:events";
import { createInterface } from "node:readline";
import { PassThrough } from "node:stream";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { chunkBytes } from "@ac-kit/core";
import { createLineCodec } from "@ac-kit/format-core";
import { frameLinkFromDuplex } from "@ac-kit/net-transport-node";

export const CHUNK_SIZE = 1400; // Roughly one TCP segment.

export function lineTraffic(lines: number): Uint8Array[] {
	const payload = Buffer.from(
		Array.from(
			{ length: lines },
			(_, i) => `250-CAPABILITY-${i} XFOO XBAR`,
		).join("\r\n") + "\r\n",
		"utf8",
	);
	return chunkBytes(payload, CHUNK_SIZE);
}

const CHUNKS = lineTraffic(2_000);

function expectDecoded(count: number): void {
	if (count !== 2_000) throw new Error(`expected 2000 lines, got ${count}`);
}

durationCondition(
	"Line framing — stream in, lines out (2 000 short lines)",
	() => {
		durationCase(
			"@ac-kit/.FrameLink + line codec",
			{ tags: { kind: "js" } },
			async () => {
				let count = 0;
				const source = new PassThrough();
				const link = frameLinkFromDuplex<string>(source, {
					codec: createLineCodec("utf-8"),
					sink: () => count++,
					maxBufferSize: 8 * 1024 * 1024,
				});
				for (const chunk of CHUNKS) source.write(chunk);
				await new Promise((resolve) => setImmediate(resolve));
				link.destroy();
				expectDecoded(count);
			},
		);
		durationCase("node:readline", { tags: { kind: "js" } }, async () => {
			const source = new PassThrough();
			const reader = createInterface({ input: source, crlfDelay: 0 });
			let count = 0;
			reader.on("line", () => count++);
			for (const chunk of CHUNKS) source.write(chunk);
			source.end();
			await once(reader, "close");
			expectDecoded(count);
		});
	},
);
