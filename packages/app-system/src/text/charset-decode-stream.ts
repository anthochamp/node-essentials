import { optionalImport } from "@ac-kit/node";

const iconvLite = await optionalImport(() => import("iconv-lite"));

/**
 * Decodes byte chunks into strings using the given charset.
 *
 * Uses the platform {@link TextDecoder} where the charset is supported and
 * iconv-lite for everything else. Split multi-byte sequences are carried across
 * chunk boundaries.
 */
export class CharsetDecodeStream extends TransformStream<Uint8Array, string> {
	readonly #charset: string;

	constructor(charset = "utf-8") {
		let decoder: { write(chunk: Uint8Array): string; end(): string };

		try {
			const textDecoder = new TextDecoder(charset);
			decoder = {
				write: (chunk) => textDecoder.decode(chunk, { stream: true }),
				end: () => textDecoder.decode(),
			};
		} catch {
			if (!iconvLite?.encodingExists(charset)) {
				throw new Error(`unsupported charset: ${charset}`);
			}
			const iconvDecoder = iconvLite.getDecoder(charset);
			decoder = {
				write: (chunk) => iconvDecoder.write(Buffer.from(chunk)),
				end: () => iconvDecoder.end() ?? "",
			};
		}

		super({
			transform(chunk, controller) {
				const text = decoder.write(chunk);
				if (text) {
					controller.enqueue(text);
				}
			},
			flush(controller) {
				const text = decoder.end();
				if (text) {
					controller.enqueue(text);
				}
			},
		});

		this.#charset = charset;
	}

	get charset(): string {
		return this.#charset;
	}
}
