import { type AbortableProps, abortableAsync } from "../function/abortable.js";
import type {
	PromiseExecutor,
	PromiseOnFinally,
	PromiseOnFulfilled,
	PromiseOnRejected,
	PromiseReject,
	PromiseResolve,
} from "./types.js";

export class AbortablePromise<T> implements Promise<T> {
	static withResolvers<ST>(props: AbortableProps): PromiseWithResolvers<ST> {
		let resolve: PromiseResolve<ST>;
		let reject: PromiseReject;

		const promise = new AbortablePromise<ST>((resolve_, reject_) => {
			resolve = resolve_;
			reject = reject_;
		}, props);

		// biome-ignore lint/style/noNonNullAssertion: callback will be called synchronously
		return { promise, resolve: resolve!, reject: reject! };
	}

	private readonly deferred = Promise.withResolvers<T>();

	constructor(
		executor: PromiseExecutor<T>,
		readonly props: AbortableProps,
	) {
		const abortableDeferred = Promise.withResolvers<T>();

		abortableAsync(async () => {
			executor(abortableDeferred.resolve, abortableDeferred.reject);

			return abortableDeferred.promise;
		}, props)().then(this.deferred.resolve, this.deferred.reject);
	}

	get [Symbol.toStringTag](): string {
		return "AbortablePromise";
	}

	// biome-ignore lint/suspicious/noThenProperty: implementing Promise interface
	then<TResult1 = T, TResult2 = never>(
		onfulfilled?: PromiseOnFulfilled<T, TResult1> | null,
		onrejected?: PromiseOnRejected<TResult2> | null,
	): Promise<TResult1 | TResult2> {
		return this.deferred.promise.then(onfulfilled, onrejected);
	}

	catch<TResult = never>(
		onrejected?: PromiseOnRejected<TResult> | null,
	): Promise<T | TResult> {
		return this.deferred.promise.catch(onrejected);
	}

	finally(onfinally?: PromiseOnFinally | null): Promise<T> {
		return this.deferred.promise.finally(onfinally);
	}
}
