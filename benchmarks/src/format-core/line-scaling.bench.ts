import { once } from "node:events";
import { createInterface } from "node:readline";
import { PassThrough } from "node:stream";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { BYTES_PER_MIB, chunkBytes } from "@ac-kit/core";
import { createLineCodec } from "@ac-kit/format-core";
import { frameLinkFromDuplex } from "@ac-kit/net-transport-node";

const CHUNK_SIZE = 1_400;
const CHUNKS = chunkBytes(
	Buffer.concat([Buffer.alloc(2 * 1024 * 1024, 0x61), Buffer.from("\r\n")]),
	CHUNK_SIZE,
);

durationCondition(
	"Line framing — one 2 MiB line in ~1400-byte segments",
	() => {
		durationCase(
			"@ac-kit/.FrameLink + line codec",
			{ tags: { kind: "js" } },
			async () => {
				let count = 0;
				const source = new PassThrough();
				const link = frameLinkFromDuplex<string>(source, {
					codec: createLineCodec("utf-8", { maxLineLength: 4 * BYTES_PER_MIB }),
					sink: () => count++,
					maxBufferSize: 8 * 1024 * 1024,
				});
				for (const chunk of CHUNKS) source.write(chunk);
				await new Promise((resolve) => setImmediate(resolve));
				link.destroy();
				if (count !== 1) throw new Error(`expected 1 line, got ${count}`);
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
			if (count !== 1) throw new Error(`expected 1 line, got ${count}`);
		});
	},
);
