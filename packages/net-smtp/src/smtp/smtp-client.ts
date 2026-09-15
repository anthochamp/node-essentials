import { encodeText } from "@ac-kit/core";
import { createLineCodec } from "@ac-kit/format-core";
import type { Disposition, ExchangeOptions, Transport } from "@ac-kit/net-core";
import {
	type BaseSessionEvents,
	Session,
	type SessionOptions,
} from "@ac-kit/net-core";

export type SmtpResponse = {
	/** The three-digit SMTP reply code. */
	code: number;
	/**
	 * Text lines from the response, one per continuation line, with the code
	 * prefix stripped.
	 */
	lines: string[];
};

export type SmtpClientEvents = BaseSessionEvents & {
	/**
	 * An unsolicited server reply, including the initial greeting.
	 *
	 * Subscribe before the first byte arrives to avoid missing the greeting.
	 */
	push: [response: SmtpResponse];
};

/** Thrown when a required intermediate SMTP reply carries an unexpected code. */
export class SmtpProtocolError extends Error {
	constructor(
		readonly response: SmtpResponse,
		message: string,
	) {
		super(message);
		this.name = "SmtpProtocolError";
	}
}

/** Construction options shared by {@link SmtpClient} and its subclasses. */
export interface SmtpClientOptions {
	/**
	 * Ceiling on undecoded received bytes. Defaults to 64 KiB, ample for the
	 * longest realistic `EHLO` capability list while still bounding a misbehaving
	 * server.
	 */
	maxBufferSize?: number;

	/**
	 * Maximum reply line length. Defaults to 1000 bytes, the limit RFC 5321
	 * §4.5.3.1.5 places on a reply line including its terminator.
	 */
	maxLineLength?: number;

	/** Applied to every command that does not specify its own timeout. */
	defaultTimeoutMs?: number;
}

/**
 * Dot-stuffs a message body per RFC 5321 §4.5.2 and appends the CRLF.CRLF
 * terminator.
 */
export function buildSmtpMessageBody(message: string): string {
	const dotStuffed = message
		.split("\r\n")
		.map((line) => (line.startsWith(".") ? `.${line}` : line))
		.join("\r\n");
	const body = dotStuffed.endsWith("\r\n") ? dotStuffed : `${dotStuffed}\r\n`;
	return `${body}.\r\n`;
}

/**
 * Commands shared by SMTP and LMTP.
 *
 * The two protocols differ only in their greeting verb and in how the message
 * body is acknowledged, so everything else lives here. LMTP deliberately does
 * not inherit {@link SmtpClient}: `DATA` yields one reply per recipient in LMTP
 * and exactly one reply in SMTP, so inheriting `data()` would expose a method
 * that silently misreads the wire.
 */
export abstract class SmtpCore extends Session<
	string,
	string,
	SmtpClientEvents
> {
	private readonly defaultTimeoutMs: number | undefined;

	/**
	 * @param source Any {@link Transport}. For a Node.js `Duplex`/`net.Socket`,
	 *   wrap it first: `new DuplexTransport(socket)` from
	 *   `@ac-kit/net-transport-node`.
	 * @param options Buffer, line-length and timeout tuning.
	 */
	constructor(source: Transport, options?: SmtpClientOptions) {
		super(SmtpCore.buildOptions(source, options));
		this.defaultTimeoutMs = options?.defaultTimeoutMs;
	}

	protected override routeFrame(frame: string): void {
		if (!this.offer(frame)) {
			this.dispatch("push", [SmtpCore.parseLines([frame])]);
		}
	}

	/**
	 * Send `EHLO domain` and return the advertised extensions.
	 *
	 * @param domain The client's own domain name.
	 * @param options Abort, timeout and abort-policy overrides.
	 * @returns The parsed reply, one entry per capability line.
	 */
	ehlo(
		domain: string,
		options?: ExchangeOptions<string>,
	): Promise<SmtpResponse> {
		return this.command(`EHLO ${domain}`, options);
	}

	/**
	 * Send `MAIL FROM:<address>`.
	 *
	 * @param address The reverse-path, without angle brackets.
	 * @param params Optional ESMTP parameters, for example `SIZE=1234`.
	 * @param options Abort, timeout and abort-policy overrides.
	 * @returns The parsed reply.
	 */
	mailFrom(
		address: string,
		params?: string,
		options?: ExchangeOptions<string>,
	): Promise<SmtpResponse> {
		const command = params
			? `MAIL FROM:<${address}> ${params}`
			: `MAIL FROM:<${address}>`;
		return this.command(command, options);
	}

	/**
	 * Send `RCPT TO:<address>`.
	 *
	 * @param address The forward-path, without angle brackets.
	 * @param options Abort, timeout and abort-policy overrides.
	 * @returns The parsed reply.
	 */
	rcptTo(
		address: string,
		options?: ExchangeOptions<string>,
	): Promise<SmtpResponse> {
		return this.command(`RCPT TO:<${address}>`, options);
	}

	/**
	 * Run the full `DATA` exchange: command, `354` intermediate reply, body, then
	 * final reply.
	 *
	 * @param message The raw message body; dot-stuffing is applied automatically.
	 * @param options Abort, timeout and abort-policy overrides.
	 * @returns The final reply for the message.
	 * @throws {SmtpProtocolError} If the server does not answer `354`.
	 */
	protected async runData(
		message: string,
		collectCount: number,
		options?: ExchangeOptions<string>,
	): Promise<SmtpResponse[]> {
		const begin = await this.command("DATA", options);
		if (begin.code !== 354) {
			throw new SmtpProtocolError(
				begin,
				`DATA command failed: ${begin.code} ${begin.lines.join(" ")}`,
			);
		}

		// Every exchange is registered before the body is written, so no reply can
		// arrive while nothing is waiting for it.
		const pending: Array<Promise<string[]>> = [];
		for (let index = 0; index < collectCount; index++) {
			pending.push(
				this.collect(SmtpCore.multiLineAccept, this.withDefaults(options)),
			);
		}
		await this.sendRaw(
			encodeText(buildSmtpMessageBody(message), "utf-8"),
			options?.signal,
		);
		return (await Promise.all(pending)).map((lines) =>
			SmtpCore.parseLines(lines),
		);
	}

	/**
	 * Send `QUIT` and read the farewell reply.
	 *
	 * @param options Abort, timeout and abort-policy overrides.
	 * @returns The parsed reply, normally `221`.
	 */
	quit(options?: ExchangeOptions<string>): Promise<SmtpResponse> {
		return this.command("QUIT", options);
	}

	/**
	 * Send a raw command line and read its reply.
	 *
	 * @param command The command line, without a terminator.
	 * @param options Abort, timeout and abort-policy overrides.
	 * @returns The parsed reply.
	 */
	async command(
		command: string,
		options?: ExchangeOptions<string>,
	): Promise<SmtpResponse> {
		const lines = await this.request(
			command,
			SmtpCore.multiLineAccept,
			this.withDefaults(options),
		);
		return SmtpCore.parseLines(lines);
	}

	/**
	 * Replace the transport after a successful `STARTTLS`.
	 *
	 * Buffered plaintext is discarded rather than carried across: bytes a peer
	 * sent before the handshake must never be read as part of the secured
	 * session, which is the STARTTLS command-injection flaw.
	 *
	 * @param transport The TLS transport wrapping the same connection.
	 */
	upgradeTransport(transport: Transport): void {
		this.swapTransport(transport);
	}

	/**
	 * Classify a reply line: `CODE-` continues the reply, anything else ends it.
	 *
	 * @param frame One decoded reply line.
	 * @returns The disposition for the pending exchange.
	 */
	protected static multiLineAccept(frame: string): Disposition {
		return frame.length >= 4 && frame[3] === "-" ? "accumulate" : "complete";
	}

	/**
	 * Assemble collected reply lines into a {@link SmtpResponse}.
	 *
	 * @param lines Reply lines in arrival order.
	 * @returns The reply code and its text lines.
	 */
	protected static parseLines(lines: string[]): SmtpResponse {
		const first = lines[0] ?? "";
		const code = Number.parseInt(first.slice(0, 3), 10);
		return {
			code,
			lines: lines.map((line) => (line.length > 4 ? line.slice(4) : "")),
		};
	}

	private static buildOptions(
		source: Transport,
		options?: SmtpClientOptions,
	): SessionOptions<string, string> {
		return {
			transport: source,
			codec: createLineCodec("utf-8", {
				maxLineLength: options?.maxLineLength ?? 1000,
			}),
			maxBufferSize: options?.maxBufferSize ?? 64 * 1024,
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
}

/**
 * SMTP client over any transport.
 *
 * Handles CRLF framing, multi-line reply assembly (`CODE-` continuations) and
 * dot-stuffing for `DATA`. Each method maps to one command; sequencing them
 * correctly per RFC 5321 is the caller's responsibility.
 *
 * Replies are strictly ordered, so the default FIFO correlation applies and
 * pipelining works with no further configuration.
 *
 * Unsolicited server lines, including the initial greeting, are dispatched as
 * `push` events; subscribe before the first byte arrives to catch the
 * greeting.
 *
 * The connection is not established here — pass an already-connected stream or
 * transport.
 */
export class SmtpClient extends SmtpCore {
	/**
	 * Run the `DATA` exchange and read the single reply for the message.
	 *
	 * @param message The raw message body; dot-stuffing is applied automatically.
	 * @param options Abort, timeout and abort-policy overrides.
	 * @returns The final reply.
	 * @throws {SmtpProtocolError} If the server does not answer `354`.
	 */
	async data(
		message: string,
		options?: ExchangeOptions<string>,
	): Promise<SmtpResponse> {
		const [response] = await this.runData(message, 1, options);
		return response!;
	}
}
