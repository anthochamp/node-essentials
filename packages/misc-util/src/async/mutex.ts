import type { Callable } from "../ecma/function/types.js";
import type { ILockable } from "./ilockable.js";
import { LockableBase } from "./lockable-base.js";
import { Semaphore } from "./semaphore.js";

/**
 * A mutex is a synchronization primitive that can be used to protect shared
 * resources from concurrent access. It is similar to a semaphore with a value
 * of 1.
 *
 * A mutex has two states: locked and unlocked. When a mutex is locked, other I/O
 * operations that attempt to lock the mutex will wait until the mutex is unlocked.
 * When a mutex is unlocked, it can be locked by an I/O operation.
 */
export class Mutex extends LockableBase implements ILockable {
	private readonly semaphore = new Semaphore(1);

	get locked(): boolean {
		return this.semaphore.value === 0;
	}

	async acquire(signal?: AbortSignal | null): Promise<Callable> {
		const releaseFunc = await this.semaphore.acquire(1, signal);

		return () => this.handleSemaphoreRelease(releaseFunc);
	}

	release(): void {
		this.handleSemaphoreRelease(this.semaphore.release);
	}

	private handleSemaphoreRelease(semaphoreReleaseFunc: Callable) {
		try {
			semaphoreReleaseFunc();
		} catch (error) {
			if (error instanceof RangeError) {
				throw new Error("Lock already released");
			} else {
				throw error;
			}
		}
	}
}
