import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import type { Codec } from "@ac-kit/format-core";
import { createNetstringCodec } from "@ac-kit/format-netstring";
import netstring from "netstring";

import {
	NETSTRING_FRAMES,
	NETSTRING_PAYLOAD,
	decodeContext,
	netstringTraffic,
} from "./__fixtures__/fixtures.js";

const TRAFFIC = Buffer.concat(
	netstringTraffic(NETSTRING_FRAMES, NETSTRING_PAYLOAD),
);

function expectDecoded(count: number): void {
	if (count !== NETSTRING_FRAMES)
		throw new Error(`expected ${NETSTRING_FRAMES} frames, got ${count}`);
}

function scanNetstringZeroCopy(
	view: Buffer,
): { payload: Buffer; consumed: number } | null {
	let length = 0;
	let colon = -1;
	for (let index = 0; index < view.length; index++) {
		const byte = view[index]!;
		if (byte === 0x3a) {
			colon = index;
			break;
		}
		if (byte < 0x30 || byte > 0x39) return null;
		length = length * 10 + (byte - 0x30);
	}
	if (colon === -1 || colon + 1 + length >= view.length) return null;
	if (view[colon + 1 + length] !== 0x2c) return null;
	return {
		payload: view.subarray(colon + 1, colon + 1 + length),
		consumed: colon + 1 + length + 1,
	};
}

durationCondition(
	`Netstring parsing — contiguous buffer, no stream (${NETSTRING_FRAMES} × ${NETSTRING_PAYLOAD} B)`,
	() => {
		durationCase(
			"createNetstringCodec().decode (copies payload)",
			{ tags: { kind: "js" } },
			async () => {
				const codec: Codec<Uint8Array, Uint8Array | string> =
					createNetstringCodec();
				let view = TRAFFIC;
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
			"same scan, no payload copy",
			{ tags: { kind: "js" } },
			async () => {
				let view = TRAFFIC;
				let count = 0;
				while (view.length > 0) {
					const frame = scanNetstringZeroCopy(view);
					if (frame === null) break;
					count++;
					view = view.subarray(frame.consumed);
				}
				expectDecoded(count);
			},
		);

		durationCase(
			"netstring (npm, returns views)",
			{ tags: { kind: "js" } },
			async () => {
				let view = TRAFFIC;
				let count = 0;
				while (view.length > 0) {
					const payload = netstring.nsPayload(view);
					if (typeof payload === "number") break;
					count++;
					view = view.subarray(netstring.nsLength(view));
				}
				expectDecoded(count);
			},
		);
	},
);
