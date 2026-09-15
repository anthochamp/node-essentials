import type {
	DecodeContext,
	Decoder,
	DecodeResult,
	Encoder,
} from "@ac-kit/format-core";

import type { IniNode } from "./ast.js";
import {
	parseIniDocument,
	type IniParseOptions,
} from "./parse-ini-document.js";
import { printIniDocument } from "./print-ini-document.js";

/**
 * Decodes one {@link IniNode} per line.
 *
 * INI is line-oriented and every line — section header, property, comment,
 * blank — is self-delimiting, so unlike JSON, YAML or TOML the grammar really
 * does stream. That is what makes this wire face possible at all; the three
 * formats it used to be grouped with have no equivalent.
 *
 * Offsets in the emitted spans are relative to the line, not to the whole
 * document: the decoder never sees what came before. Use
 * {@link parseIniDocument} where document-absolute spans are needed.
 */
export class IniLineDecoder implements Decoder<IniNode, string> {
	constructor(private readonly options?: IniParseOptions) {}

	decode(view: string, context: DecodeContext): DecodeResult<IniNode> {
		const newline = view.indexOf("\n");

		if (newline === -1) {
			if (!context.atEof || view.length === 0) {
				return { status: "incomplete" };
			}
			return this.decodeLine(view, view.length);
		}
		return this.decodeLine(view.slice(0, newline), newline + 1);
	}

	private decodeLine(line: string, consumed: number): DecodeResult<IniNode> {
		const { nodes } = parseIniDocument(line, this.options);
		const node = nodes[0];
		if (!node) {
			return { status: "skip", consumed };
		}
		return { status: "decoded", value: node, consumed };
	}
}

/** Options for {@link createIniLineEncoder}. */
export type IniLineEncoderOptions = {
	/** Line terminator appended to each node. Defaults to `"\n"`. */
	readonly newline?: string;
};

/** Creates the INI write half, emitting one terminated line per node. */
export function createIniLineEncoder(
	options?: IniLineEncoderOptions,
): Encoder<IniNode, string> {
	const newline = options?.newline ?? "\n";
	return {
		encode: (node) =>
			printIniDocument({ nodes: [node], trailingNewline: true }, { newline }),
	};
}
