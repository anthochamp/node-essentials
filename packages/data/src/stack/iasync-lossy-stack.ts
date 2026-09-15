import { DefinedValue } from "@ac-kit/core";

import { ILossy } from "../collection/ilossy.js";
import { IAsyncStack } from "./iasync-stack.js";

/** The async-backed sibling of {@link ILossyStack}. */
export interface IAsyncLossyStack<T extends DefinedValue = DefinedValue>
	extends Omit<IAsyncStack<T>, "push" | "pushAll">, ILossy {
	push(item: T, signal?: AbortSignal): Promise<readonly T[]>;

	pushAll(items: Iterable<T>, signal?: AbortSignal): Promise<readonly T[]>;
}
