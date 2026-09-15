import { decodeText, encodeTextUtf8 } from "@ac-kit/core";
import { createNetstringCodec } from "@ac-kit/format-netstring";
import type { ExchangeOptions, Transport } from "@ac-kit/net-core";
import {
	type BaseSessionEvents,
	Session,
	type SessionOptions,
} from "@ac-kit/net-core";

/** A parsed socketmap lookup result. */
export type SocketmapResult = {
	/** The status token returned by the server, such as `OK`, `NOTFOUND`, `TEMP`. */
	status: string;
	/** The value accompanying the status, or an empty string if absent. */
	value: string;
};

/** Events emitted by {@link SocketmapClient}. */
export type SocketmapClientEvents = BaseSessionEvents;

/** Construction options for {@link SocketmapClient}. */
export interface SocketmapClientOptions {
	/** Ceiling on undecoded received bytes. Defaults to 1 MiB. */
	maxBufferSize?: number;

	/**
	 * Maximum declared netstring payload length. Defaults to 100 KiB, well above
	 * any realistic lookup result and low enough that a bogus length declaration
	 * is rejected immediately.
	 */
	maxPayloadLength?: number;

	/** Applied to every lookup that does not specify its own timeout. */
	defaultTimeoutMs?: number;
}

/**
 * Postfix socketmap client.
 *
 * Implements the socketmap lookup protocol over netstring framing. The protocol
 * is purely request-response with no unsolicited frames, so every inbound
 * netstring answers the preceding {@link lookup}.
 *
 * Spec: http://www.postfix.org/socketmap_table.5.html
 */
export class SocketmapClient extends Session<
	Uint8Array,
	Uint8Array | string,
	SocketmapClientEvents
> {
	private readonly defaultTimeoutMs: number | undefined;

	/**
	 * @param source Any {@link Transport}. Postfix socketmaps are usually reached
	 *   over a Unix socket — for a Node.js `Duplex`/`net.Socket`, wrap it first:
	 *   `new DuplexTransport(socket)` from `@ac-kit/net-transport-node`.
	 * @param options Buffer, payload-length and timeout tuning.
	 */
	constructor(source: Transport, options?: SocketmapClientOptions) {
		super(SocketmapClient.buildOptions(source, options));
		this.defaultTimeoutMs = options?.defaultTimeoutMs;
	}

	protected override routeFrame(frame: Uint8Array): void {
		this.offer(frame);
	}

	/**
	 * Look a key up in a table.
	 *
	 * @param table The socketmap table name, for example `forward`.
	 * @param key The key to look up.
	 * @param options Abort, timeout and abort-policy overrides.
	 * @returns The status token and its accompanying value.
	 */
	async lookup(
		table: string,
		key: string,
		options?: ExchangeOptions<Uint8Array>,
	): Promise<SocketmapResult> {
		const request = encodeTextUtf8(`${table} ${key}`);
		const frames = await this.request(
			request,
			() => "complete",
			this.withDefaults(options),
		);
		return SocketmapClient.parseResponse(decodeText(frames[0]!, "utf-8"));
	}

	private static buildOptions(
		source: Transport,
		options?: SocketmapClientOptions,
	): SessionOptions<Uint8Array, Uint8Array | string> {
		return {
			transport: source,
			codec: createNetstringCodec({
				maxPayloadLength: options?.maxPayloadLength ?? 100 * 1024,
			}),
			maxBufferSize: options?.maxBufferSize ?? 1024 * 1024,
		};
	}

	/** Applies the client-wide timeout when the call site did not set one. */
	private withDefaults(
		options?: ExchangeOptions<Uint8Array>,
	): ExchangeOptions<Uint8Array> | undefined {
		if (
			this.defaultTimeoutMs === undefined ||
			options?.timeoutMs !== undefined
		) {
			return options;
		}
		return { ...options, timeoutMs: this.defaultTimeoutMs };
	}

	private static parseResponse(response: string): SocketmapResult {
		const space = response.indexOf(" ");
		const status = space === -1 ? response : response.slice(0, space);
		const value = space === -1 ? "" : response.slice(space + 1);
		return { status, value };
	}
}
