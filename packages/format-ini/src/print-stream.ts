import { EncodeStream } from "@ac-kit/format-core";

import type { IniNode } from "./ast.js";
import {
	createIniLineEncoder,
	type IniLineEncoderOptions,
} from "./ini-line-codec.js";

/** Renders {@link IniNode}s back to INI text, one terminated line each. */
export class IniPrintStream extends EncodeStream<IniNode, string> {
	constructor(options?: IniLineEncoderOptions) {
		super(createIniLineEncoder(options));
	}
}
