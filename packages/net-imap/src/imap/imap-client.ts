import { BYTES_PER_KIB, BYTES_PER_MIB } from "@ac-kit/core";
import { createLineCodec } from "@ac-kit/format-core";
import type { Disposition, ExchangeOptions, Transport } from "@ac-kit/net-core";
import {
	type BaseSessionEvents,
	ScanningRegistry,
	Session,
	type SessionOptions,
} from "@ac-kit/net-core";

/** Status word of a tagged IMAP response. */
export type ImapStatus = "OK" | "NO" | "BAD";

/** A completed IMAP command result. */
export type ImapResponse = {
	/** The tagged response status. */
	status: ImapStatus;
	/** Text following the status on the tagged response line. */
	text: string;
	/** All untagged (`*`) lines received before the tagged response. */
	untagged: string[];
};

/** Thrown when a tagged IMAP response carries an unparseable status. */
export class ImapProtocolError extends Error {
	constructor(
		readonly raw: string,
		message: string,
	) {
		super(message);
		this.name = "ImapProtocolError";
	}
}

/** Events emitted by {@link ImapClient}. */
export type ImapClientEvents = BaseSessionEvents & {
	/**
	 * Every untagged (`*`) line and the initial greeting. Untagged lines are also
	 * forwarded to the command that is collecting them.
	 */
	push: [line: string];
};

/** Construction options for {@link ImapClient}. */
export interface ImapClientOptions {
	/**
	 * Ceiling on undecoded received bytes. Defaults to 1 MiB, since IMAP
	 * responses such as `FETCH` envelopes can be substantially larger than a mail
	 * command line.
	 */
	maxBufferSize?: number;

	/**
	 * Maximum response line length. Defaults to 64 KiB; IMAP sets no line limit,
	 * so this is a safety bound rather than a protocol constant.
	 */
	maxLineLength?: number;

	/**
	 * How many outstanding commands an inbound line may be offered to.
	 *
	 * Defaults to 8. IMAP servers may complete pipelined commands out of order,
	 * so unlike SMTP a strict depth of 1 would mis-attribute responses.
	 */
	maxPipelineDepth?: number;

	/** Applied to every command that does not specify its own timeout. */
	defaultTimeoutMs?: number;
}

/**
 * IMAP4rev1 client over any transport.
 *
 * Handles CRLF framing, tagged command correlation and untagged response
 * collection. Tags are generated automatically by the high-level methods; use
 * {@link command} with an explicit tag for finer control.
 *
 * Correlation scans several outstanding commands rather than only the oldest,
 * because a server may complete pipelined commands out of order.
 *
 * Untagged lines and the greeting are dispatched as `push` events; subscribe
 * before the first byte arrives to catch the greeting.
 */
export class ImapClient extends Session<string, string, ImapClientEvents> {
	private tagCounter = 0;
	private readonly defaultTimeoutMs: number | undefined;

	/**
	 * @param source Any {@link Transport}. For a Node.js `Duplex`/`net.Socket`,
	 *   wrap it first: `new DuplexTransport(socket)` from
	 *   `@ac-kit/net-transport-node`.
	 * @param options Buffer, line-length, pipelining and timeout tuning.
	 */
	constructor(source: Transport, options?: ImapClientOptions) {
		super(ImapClient.buildOptions(source, options));
		this.defaultTimeoutMs = options?.defaultTimeoutMs;
	}

	protected override routeFrame(frame: string): void {
		const claimed = this.offer(frame);
		// Untagged lines are always visible to subscribers, claimed or not.
		if (frame.startsWith("* ") || !claimed) {
			this.dispatch("push", [frame]);
		}
	}

	/**
	 * Send `TAG CMD` and collect every line up to the tagged response.
	 *
	 * @param tag The command tag to correlate on.
	 * @param cmd The command and its arguments.
	 * @param options Abort, timeout and abort-policy overrides.
	 * @returns The tagged response with all preceding untagged lines.
	 * @throws {ImapProtocolError} If the tagged status is not OK, NO or BAD.
	 */
	async command(
		tag: string,
		cmd: string,
		options?: ExchangeOptions<string>,
	): Promise<ImapResponse> {
		const lines = await this.request(
			`${tag} ${cmd}`,
			ImapClient.makeAccept(tag),
			this.withDefaults(options),
		);
		return ImapClient.parseTaggedResponse(tag, lines);
	}

	/**
	 * Send `LOGIN user password`, quoting both as IMAP quoted strings.
	 *
	 * @param user The account name.
	 * @param password The account password.
	 * @param options Abort, timeout and abort-policy overrides.
	 */
	login(
		user: string,
		password: string,
		options?: ExchangeOptions<string>,
	): Promise<ImapResponse> {
		return this.command(
			this.nextTag(),
			`LOGIN "${user}" "${password}"`,
			options,
		);
	}

	/**
	 * Send `SELECT mailbox`.
	 *
	 * @param mailbox The mailbox name.
	 * @param options Abort, timeout and abort-policy overrides.
	 * @returns The reply including untagged `EXISTS`, `FLAGS` and similar lines.
	 */
	select(
		mailbox: string,
		options?: ExchangeOptions<string>,
	): Promise<ImapResponse> {
		return this.command(this.nextTag(), `SELECT "${mailbox}"`, options);
	}

	/**
	 * Send `CAPABILITY`.
	 *
	 * @param options Abort, timeout and abort-policy overrides.
	 */
	capability(options?: ExchangeOptions<string>): Promise<ImapResponse> {
		return this.command(this.nextTag(), "CAPABILITY", options);
	}

	/**
	 * Send `LOGOUT`.
	 *
	 * @param options Abort, timeout and abort-policy overrides.
	 * @returns The `BYE` line plus the tagged response.
	 */
	logout(options?: ExchangeOptions<string>): Promise<ImapResponse> {
		return this.command(this.nextTag(), "LOGOUT", options);
	}

	/**
	 * Replace the transport after a successful `STARTTLS`.
	 *
	 * Buffered plaintext is discarded rather than carried across, since bytes
	 * sent before the handshake must never be read as part of the secured
	 * session.
	 *
	 * @param transport The TLS transport wrapping the same connection.
	 */
	upgradeTransport(transport: Transport): void {
		this.swapTransport(transport);
	}

	/**
	 * Generate the next sequenced tag.
	 *
	 * @returns A tag of the form `A0001`.
	 */
	nextTag(): string {
		this.tagCounter++;
		return `A${String(this.tagCounter).padStart(4, "0")}`;
	}

	private static buildOptions(
		source: Transport,
		options?: ImapClientOptions,
	): SessionOptions<string, string> {
		return {
			transport: source,
			codec: createLineCodec("utf-8", {
				maxLineLength: options?.maxLineLength ?? 64 * BYTES_PER_KIB,
			}),
			maxBufferSize: options?.maxBufferSize ?? BYTES_PER_MIB,
			registry: new ScanningRegistry<string>({
				maxDepth: options?.maxPipelineDepth ?? 8,
			}),
		};
	}

	/** Applies the client-wide timeout when the call site did not set one. */
	private withDefaults(
		options?: ExchangeOptions<string>,
	): ExchangeOptions<string> | undefined {
		if (
			this.defaultTimeoutMs === undefined ||
			options?.timeoutMs !== undefined
		) {
			return options;
		}
		return { ...options, timeoutMs: this.defaultTimeoutMs };
	}

	private static makeAccept(tag: string): (frame: string) => Disposition {
		const prefix = `${tag} `;
		return (frame: string): Disposition => {
			if (frame.startsWith(prefix)) {
				return "complete";
			}
			if (frame.startsWith("* ")) {
				return "accumulate";
			}
			return "skip";
		};
	}

	private static parseTaggedResponse(
		tag: string,
		lines: string[],
	): ImapResponse {
		const untagged = lines.filter((line) => line.startsWith("* "));
		const tagged = lines.find((line) => line.startsWith(`${tag} `)) ?? "";
		const rest = tagged.slice(tag.length + 1);
		const space = rest.indexOf(" ");
		const statusText = space === -1 ? rest : rest.slice(0, space);
		const text = space === -1 ? "" : rest.slice(space + 1);
		const upper = statusText.toUpperCase();
		if (upper !== "OK" && upper !== "NO" && upper !== "BAD") {
			throw new ImapProtocolError(
				tagged,
				`Unrecognised IMAP tagged status: ${statusText}`,
			);
		}
		return { status: upper, text, untagged };
	}
}
