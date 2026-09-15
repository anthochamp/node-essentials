import toml, { type TomlTable, type TomlTableWithoutBigInt } from "smol-toml";

export type TomlParseOptions = {
	useBigInt?: boolean | "asNeeded";
};

/** Parses a TOML string into an object. */
export function parseToml<TOptions extends TomlParseOptions>(
	source: string,
	options?: TOptions,
): TOptions["useBigInt"] extends false | undefined
	? TomlTableWithoutBigInt
	: TomlTable {
	try {
		return toml.parse(source, {
			integersAsBigInt: options?.useBigInt,
		}) as TOptions["useBigInt"] extends false | undefined
			? TomlTableWithoutBigInt
			: TomlTable;
	} catch (error) {
		throw new Error("parse TOML", { cause: error });
	}
}
