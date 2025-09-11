import type { MaybeAsyncCallable } from "@ac-essentials/misc-util";
import type { Promisable } from "type-fest";

export function resolveConfigValue<A extends unknown[], R>(
	configValue: MaybeAsyncCallable<A, R> | R,
	...args: A
): Promisable<R> {
	if (typeof configValue === "function") {
		return (configValue as MaybeAsyncCallable<A, R>)(...args);
	}

	return configValue;
}
