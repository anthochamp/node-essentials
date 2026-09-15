import type { ExchangeOptions, Transport } from "@ac-kit/net-core";

import {
	buildSmtpMessageBody,
	SmtpCore,
	SmtpProtocolError,
	type SmtpResponse,
} from "../smtp/smtp-client.js";

export { buildSmtpMessageBody, SmtpProtocolError };
export type { SmtpResponse };

/**
 * LMTP client over any transport.
 *
 * LMTP (RFC 2033) is SMTP with `LHLO` in place of `EHLO` and, critically, one
 * reply per recipient after the message body instead of a single reply.
 *
 * It extends {@link SmtpCore} rather than `SmtpClient` precisely because of that
 * difference: inheriting `SmtpClient.data()` would expose a method that reads
 * only the first recipient's reply and leaves the rest to be mis-attributed to
 * the next command.
 */
export class LmtpClient extends SmtpCore {
	/**
	 * @param source Any {@link Transport}. Dovecot LMTP is commonly reached over
	 *   a Unix socket — for a Node.js `Duplex`/`net.Socket`, wrap it first: `new
	 *   DuplexTransport(socket)` from `@ac-kit/net-transport-node`.
	 * @param options Buffer, line-length and timeout tuning.
	 */
	constructor(
		source: Transport,
		options?: ConstructorParameters<typeof SmtpCore>[1],
	) {
		super(source, options);
	}

	/**
	 * Send `LHLO domain`, the LMTP greeting.
	 *
	 * @param domain The client's own domain name.
	 * @param options Abort, timeout and abort-policy overrides.
	 * @returns The parsed reply, one entry per capability line.
	 */
	lhlo(
		domain: string,
		options?: ExchangeOptions<string>,
	): Promise<SmtpResponse> {
		return this.command(`LHLO ${domain}`, options);
	}

	/**
	 * Run the `DATA` exchange and read one reply per accepted recipient.
	 *
	 * Replies arrive in the order the corresponding `RCPT TO` commands were
	 * issued (RFC 2033 §4.2).
	 *
	 * @param message The raw message body; dot-stuffing is applied automatically.
	 * @param recipientCount Number of `RCPT TO` commands the server accepted.
	 * @param options Abort, timeout and abort-policy overrides.
	 * @returns One reply per recipient, in `RCPT TO` order.
	 * @throws {SmtpProtocolError} If the server does not answer `354`.
	 */
	dataMulti(
		message: string,
		recipientCount: number,
		options?: ExchangeOptions<string>,
	): Promise<SmtpResponse[]> {
		return this.runData(message, recipientCount, options);
	}
}
