import { DefinedValue } from "@ac-kit/core";

import { ILossy } from "../collection/ilossy.js";
import { IAsyncDeque } from "./iasync-deque.js";

/** The async-backed sibling of {@link ILossyDeque}. */
export interface IAsyncLossyDeque<T extends DefinedValue = DefinedValue>
	extends
		Omit<IAsyncDeque<T>, "unshift" | "unshiftAll" | "push" | "pushAll">,
		ILossy {
	unshift(item: T, signal?: AbortSignal): Promise<readonly T[]>;

	unshiftAll(items: Iterable<T>, signal?: AbortSignal): Promise<readonly T[]>;

	push(item: T, signal?: AbortSignal): Promise<readonly T[]>;

	pushAll(items: Iterable<T>, signal?: AbortSignal): Promise<readonly T[]>;
}
