import { CstModuleDefinition } from "./cst/module.js";
import { ParseError, Parser } from "./parser.js";

export interface ParseResult {
	readonly cst: CstModuleDefinition;
	readonly errors: readonly ParseError[];
}

export function parseModule(source: string): ParseResult {
	const parser = new Parser(source);
	const cst = parser.parseModule();
	return { cst, errors: parser.errors };
}
