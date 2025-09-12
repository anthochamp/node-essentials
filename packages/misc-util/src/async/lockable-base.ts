import type { Promisable } from "type-fest";
import type {
	Callable,
	MaybeAsyncCallableNoArgs,
} from "../ecma/function/types.js";
import type { ILockable } from "./ilockable.js";

export abstract class LockableBase implements ILockable {
	abstract readonly locked: boolean;
	abstract acquire(signal?: AbortSignal | null): Promisable<Callable>;
	abstract release(): Promisable<void>;

	async withLock<R>(
		callback: MaybeAsyncCallableNoArgs<R>,
		signal?: AbortSignal | null,
	): Promise<R> {
		const release = await this.acquire(signal);

		try {
			return await callback();
		} finally {
			release();
		}
	}
}
