import { type AbortableProps, abortableAsync } from "../function/abortable.js";
import type {
	PromiseExecutor,
	PromiseOnFinally,
	PromiseOnFulfilled,
	PromiseOnRejected,
	PromiseReject,
	PromiseResolve,
} from "./types.js";

/**
 * A Promise that is abortable via an AbortSignal.
 *
 * When the signal is aborted, the onAbort callback is called and the promise
 * is rejected. If the signal is already aborted when the promise is created, the
 * onAbort callback is called immediately and the promise is rejected. The executor
 * function is still called in all cases to maintain consistency with the standard
 * Promise behavior.
 *
 * The executor function is called immediately (synchronously) upon construction,
 * similar to a standard Promise.
 *
 * @template T The type of the promise result.
 */
export class AbortablePromise<T> implements Promise<T> {
	/**
	 * Creates a new AbortablePromise with resolvers.
	 *
	 * @param props The abortable properties.
	 * @returns A new AbortablePromise with resolvers.
	 */
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

	/**
	 * Creates a new AbortablePromise.
	 *
	 * @param executor The promise executor function.
	 * @param props The abortable properties.
	 */
	constructor(
		executor: PromiseExecutor<T>,
		readonly props: AbortableProps,
	) {
		const { onAbort, ...restProps } = this.props;

		const abortableDeferred = Promise.withResolvers<T>();

		let executorCalled = false;
		abortableAsync(
			() => {
				executor(abortableDeferred.resolve, abortableDeferred.reject);
				executorCalled = true;

				return abortableDeferred.promise;
			},
			{
				...restProps,
				onAbort: (error) => {
					onAbort(error);
					abortableDeferred.reject(error);
				},
			},
		)().then(this.deferred.resolve, this.deferred.reject);

		// wait for the executor to be called synchronously to reproduce Promise behavior
		while (!executorCalled) {}
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
