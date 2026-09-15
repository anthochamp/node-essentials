import { createLineCodec } from "@ac-kit/format-core";
import type { Disposition, ExchangeOptions, Transport } from "@ac-kit/net-core";
import {
	type BaseSessionEvents,
	Session,
	type SessionOptions,
} from "@ac-kit/net-core";

/** A parsed single-line POP3 reply. */
export type Pop3Response = {
	/** `true` for `+OK`, `false` for `-ERR`. */
	ok: boolean;
	/** Text following the status indicator. */
	text: string;
};

/** A parsed POP3 reply that carries a dot-terminated body. */
export type Pop3MultilineResponse = Pop3Response & {
	/** Body lines collected until the terminating `.`, dot-unstuffed. */
	lines: string[];
};

/** Thrown when a POP3 reply is required but the server returned `-ERR`. */
export class Pop3ProtocolError extends Error {
	constructor(
		readonly response: Pop3Response,
		message: string,
	) {
		super(message);
		this.name = "Pop3ProtocolError";
	}
}

/** Events emitted by {@link Pop3Client}. */
export type Pop3ClientEvents = BaseSessionEvents & {
	/**
	 * An unsolicited server line, including the initial greeting.
	 *
	 * Subscribe before the first byte arrives to avoid missing the greeting.
	 */
	push: [response: Pop3Response];
};

/** Construction options for {@link Pop3Client}. */
export interface Pop3ClientOptions {
	/**
	 * Ceiling on undecoded received bytes. Defaults to 64 KiB; multi-line bodies
	 * are decoded line by line, so this bounds a single line rather than a whole
	 * message.
	 */
	maxBufferSize?: number;

	/**
	 * Maximum reply line length. Defaults to 512 bytes, the limit RFC 1939 §3
	 * places on a POP3 response line.
	 */
	maxLineLength?: number;

	/** Applied to every command that does not specify its own timeout. */
	defaultTimeoutMs?: number;
}

/**
 * POP3 client over any transport.
 *
 * Handles CRLF framing, single-line and dot-terminated multi-line replies, and
 * dot-unstuffing. Each method maps to one command per RFC 1939.
 *
 * Replies are strictly ordered, so the default FIFO correlation applies.
 *
 * The connection is not established here — pass an already-connected stream or
 * transport.
 */
export class Pop3Client extends Session<string, string, Pop3ClientEvents> {
	private readonly defaultTimeoutMs: number | undefined;

	/**
	 * @param source Any {@link Transport}. For a Node.js `Duplex`/`net.Socket`,
	 *   wrap it first: `new DuplexTransport(socket)` from
	 *   `@ac-kit/net-transport-node`.
	 * @param options Buffer, line-length and timeout tuning.
	 */
	constructor(source: Transport, options?: Pop3ClientOptions) {
		super(Pop3Client.buildOptions(source, options));
		this.defaultTimeoutMs = options?.defaultTimeoutMs;
	}

	protected override routeFrame(frame: string): void {
		if (!this.offer(frame)) {
			this.dispatch("push", [Pop3Client.parseSingleLine(frame)]);
		}
	}

	/**
	 * Send a command and read its single-line reply.
	 *
	 * @param command The command line, without a terminator.
	 * @param options Abort, timeout and abort-policy overrides.
	 * @returns The parsed reply.
	 */
	async command(
		command: string,
		options?: ExchangeOptions<string>,
	): Promise<Pop3Response> {
		const lines = await this.request(
			command,
			() => "complete",
			this.withDefaults(options),
		);
		return Pop3Client.parseSingleLine(lines[0] ?? "");
	}

	/**
	 * Send a command and read its status line plus dot-terminated body.
	 *
	 * @param command The command line, without a terminator.
	 * @param options Abort, timeout and abort-policy overrides.
	 * @returns The parsed reply with its body lines, dot-unstuffed.
	 */
	async commandMultiline(
		command: string,
		options?: ExchangeOptions<string>,
	): Promise<Pop3MultilineResponse> {
		let isFirstFrame = true;
		const accept = (frame: string): Disposition => {
			if (isFirstFrame) {
				isFirstFrame = false;
				return frame.startsWith("+OK") ? "accumulate" : "complete";
			}
			return frame === "." ? "complete" : "accumulate";
		};

		const lines = await this.request(
			command,
			accept,
			this.withDefaults(options),
		);
		const header = Pop3Client.parseSingleLine(lines[0] ?? "");
		if (!header.ok) {
			return { ...header, lines: [] };
		}
		// lines[0] is the status, lines[1..n-1] the body, lines[n] the terminator.
		const body = lines
			.slice(1, -1)
			.map((line) => (line.startsWith("..") ? line.slice(1) : line));
		return { ...header, lines: body };
	}

	/**
	 * Send `USER username`.
	 *
	 * @param username The mailbox name.
	 * @param options Abort, timeout and abort-policy overrides.
	 */
	user(
		username: string,
		options?: ExchangeOptions<string>,
	): Promise<Pop3Response> {
		return this.command(`USER ${username}`, options);
	}

	/**
	 * Send `PASS password`.
	 *
	 * @param password The mailbox password.
	 * @param options Abort, timeout and abort-policy overrides.
	 */
	pass(
		password: string,
		options?: ExchangeOptions<string>,
	): Promise<Pop3Response> {
		return this.command(`PASS ${password}`, options);
	}

	/**
	 * Send `STAT`.
	 *
	 * @param options Abort, timeout and abort-policy overrides.
	 * @returns The `+OK count size` reply.
	 */
	stat(options?: ExchangeOptions<string>): Promise<Pop3Response> {
		return this.command("STAT", options);
	}

	/**
	 * Send `LIST` and read every scan listing.
	 *
	 * @param options Abort, timeout and abort-policy overrides.
	 */
	list(options?: ExchangeOptions<string>): Promise<Pop3MultilineResponse> {
		return this.commandMultiline("LIST", options);
	}

	/**
	 * Send `LIST msg` for a single message.
	 *
	 * @param msg The message number.
	 * @param options Abort, timeout and abort-policy overrides.
	 */
	listOne(
		msg: number,
		options?: ExchangeOptions<string>,
	): Promise<Pop3Response> {
		return this.command(`LIST ${msg}`, options);
	}

	/**
	 * Send `RETR msg` and read the full message.
	 *
	 * @param msg The message number.
	 * @param options Abort, timeout and abort-policy overrides.
	 */
	retr(
		msg: number,
		options?: ExchangeOptions<string>,
	): Promise<Pop3MultilineResponse> {
		return this.commandMultiline(`RETR ${msg}`, options);
	}

	/**
	 * Send `DELE msg`.
	 *
	 * @param msg The message number.
	 * @param options Abort, timeout and abort-policy overrides.
	 */
	dele(msg: number, options?: ExchangeOptions<string>): Promise<Pop3Response> {
		return this.command(`DELE ${msg}`, options);
	}

	/**
	 * Send `NOOP`.
	 *
	 * @param options Abort, timeout and abort-policy overrides.
	 */
	noop(options?: ExchangeOptions<string>): Promise<Pop3Response> {
		return this.command("NOOP", options);
	}

	/**
	 * Send `QUIT`.
	 *
	 * @param options Abort, timeout and abort-policy overrides.
	 */
	quit(options?: ExchangeOptions<string>): Promise<Pop3Response> {
		return this.command("QUIT", options);
	}

	/**
	 * Send `CAPA` and read the capability list.
	 *
	 * @param options Abort, timeout and abort-policy overrides.
	 */
	capa(options?: ExchangeOptions<string>): Promise<Pop3MultilineResponse> {
		return this.commandMultiline("CAPA", options);
	}

	/**
	 * Send `UIDL` and read every unique identifier.
	 *
	 * @param options Abort, timeout and abort-policy overrides.
	 */
	uidl(options?: ExchangeOptions<string>): Promise<Pop3MultilineResponse> {
		return this.commandMultiline("UIDL", options);
	}

	/**
	 * Send `UIDL msg` for a single message.
	 *
	 * @param msg The message number.
	 * @param options Abort, timeout and abort-policy overrides.
	 */
	uidlOne(
		msg: number,
		options?: ExchangeOptions<string>,
	): Promise<Pop3Response> {
		return this.command(`UIDL ${msg}`, options);
	}

	/**
	 * Send `STLS`. The caller performs the TLS handshake and then calls
	 * {@link upgradeTransport}.
	 *
	 * @param options Abort, timeout and abort-policy overrides.
	 */
	stls(options?: ExchangeOptions<string>): Promise<Pop3Response> {
		return this.command("STLS", options);
	}

	/**
	 * Replace the transport after a successful `STLS`.
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

	private static buildOptions(
		source: Transport,
		options?: Pop3ClientOptions,
	): SessionOptions<string, string> {
		return {
			transport: source,
			codec: createLineCodec("utf-8", {
				maxLineLength: options?.maxLineLength ?? 512,
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

	private static parseSingleLine(line: string): Pop3Response {
		const ok = line.startsWith("+OK");
		const text = ok
			? line.slice(4)
			: line.startsWith("-ERR")
				? line.slice(5)
				: line;
		return { ok, text };
	}
}
