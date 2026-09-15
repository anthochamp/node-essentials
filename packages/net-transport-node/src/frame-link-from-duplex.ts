import type { Duplex } from "node:stream";

import type { FrameLinkOptions } from "@ac-kit/net-core";
import { FrameLink } from "@ac-kit/net-core";

import { DuplexTransport } from "./duplex-transport.js";

/**
 * Bind a frame link to an already-connected duplex stream.
 *
 * @param stream An already-connected duplex stream.
 * @param options FrameLink options excluding the transport.
 * @returns A frame link bound to a {@link DuplexTransport} over `stream`.
 */
export function frameLinkFromDuplex<In, Out = In>(
	stream: Duplex,
	options: Omit<FrameLinkOptions<In, Out>, "transport">,
): FrameLink<In, Out> {
	return new FrameLink<In, Out>({
		...options,
		transport: new DuplexTransport(stream),
	});
}
