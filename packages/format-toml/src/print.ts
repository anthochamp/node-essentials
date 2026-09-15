import toml from "smol-toml";

type TomlPrintOptions = NonNullable<Parameters<typeof toml.stringify>[1]>;

/** Serializes an object to a TOML string. */
export function printToml(value: unknown, options?: TomlPrintOptions): string {
	try {
		return toml.stringify(value, options);
	} catch (error) {
		throw new Error("print TOML", { cause: error });
	}
}
