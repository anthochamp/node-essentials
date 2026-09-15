import { optionalImport } from "@ac-kit/node";

const iconvLite = await optionalImport(() => import("iconv-lite"));

/**
 * Encodes string chunks into bytes using the given charset.
 *
 * Uses the platform {@link TextEncoder} for UTF-8 and iconv-lite for everything
 * else.
 */
export class CharsetEncodeStream extends TransformStream<string, Uint8Array> {
	readonly #charset: string;

	constructor(charset = "utf-8") {
		let encoder: { write(text: string): Uint8Array; end(): Uint8Array | null };

		if (charset === "utf-8" || charset === "utf8") {
			const textEncoder = new TextEncoder();
			encoder = { write: (text) => textEncoder.encode(text), end: () => null };
		} else if (iconvLite?.encodingExists(charset)) {
			const iconvEncoder = iconvLite.getEncoder(charset);
			encoder = {
				write: (text) => new Uint8Array(iconvEncoder.write(text)),
				end: () => {
					const tail = iconvEncoder.end();
					return tail?.length ? new Uint8Array(tail) : null;
				},
			};
		} else {
			throw new Error(`unsupported charset: ${charset}`);
		}

		super({
			transform(chunk, controller) {
				controller.enqueue(encoder.write(chunk));
			},
			flush(controller) {
				const tail = encoder.end();
				if (tail) {
					controller.enqueue(tail);
				}
			},
		});

		this.#charset = charset;
	}

	get charset(): string {
		return this.#charset;
	}
}
