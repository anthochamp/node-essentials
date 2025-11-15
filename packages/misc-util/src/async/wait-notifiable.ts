import type { Callback } from "../ecma/function/types.js";
import { AbortablePromise } from "../ecma/promise/abortable-promise.js";
import type { ISubscribable } from "./isubscribable.js";

export async function waitNotifiable<T extends unknown[]>(
	notifiable: ISubscribable<T>,
	signal?: AbortSignal | null,
): Promise<T> {
	let unsubscribe: Callback | null = null;

	const deferred = AbortablePromise.withResolvers<T>({
		signal,
		onAbort: () => {
			unsubscribe?.();
		},
	});

	unsubscribe = notifiable.subscribe((...args: T) => deferred.resolve(args), {
		once: true,
	});

	return deferred.promise;
}
