import { PerformanceObserver } from "node:perf_hooks";
import v8 from "node:v8";

/** One reading of the counters every resource figure is derived from. */
export type ResourceCounters = {
	cpuUserUs: number;
	cpuSystemUs: number;
	heapUsedBytes: number;
	externalBytes: number;
	arrayBuffersBytes: number;
	rssBytes: number;
};

/**
 * Read twice per batch, so it allocates as little as the platform allows:
 * `v8.getHeapStatistics()` is deliberately not called here — it builds the
 * largest result of the three, and the only field wanted from it is a constant.
 * See {@link readHeapLimitBytes}.
 */
export function readResourceCounters(): ResourceCounters {
	const cpu = process.cpuUsage();
	const memory = process.memoryUsage();

	return {
		cpuUserUs: cpu.user,
		cpuSystemUs: cpu.system,
		heapUsedBytes: memory.heapUsed,
		externalBytes: memory.external,
		arrayBuffersBytes: memory.arrayBuffers,
		rssBytes: memory.rss,
	};
}

/** The heap ceiling this process was given, fixed for its lifetime. */
export function readHeapLimitBytes(): number {
	return v8.getHeapStatistics().heap_size_limit;
}

/**
 * Bytes a batch asked the allocator for, as the growth in everything the heap
 * accounts for.
 *
 * Negative when a collection ran mid-batch and freed more than was allocated,
 * which is why {@link forceCollection} is called before a batch rather than
 * during it. Clamped at zero: a batch cannot allocate a negative amount, and
 * reporting one would make a mean meaningless.
 */
export function allocatedBytes(
	before: ResourceCounters,
	after: ResourceCounters,
): number {
	const growth =
		after.heapUsedBytes -
		before.heapUsedBytes +
		(after.externalBytes - before.externalBytes) +
		(after.arrayBuffersBytes - before.arrayBuffersBytes);

	return Math.max(0, growth);
}

export function cpuTimeMs(
	before: ResourceCounters,
	after: ResourceCounters,
): number {
	return (
		(after.cpuUserUs -
			before.cpuUserUs +
			(after.cpuSystemUs - before.cpuSystemUs)) /
		1000
	);
}

/** Whether the run was started with `--expose-gc`. */
export function hasExposedCollector(): boolean {
	return typeof globalThis.gc === "function";
}

/**
 * Collects, so a batch starts from a known floor and its growth is what it
 * allocated rather than what the collector happened not to have reclaimed yet.
 *
 * A no-op without `--expose-gc`; callers warn rather than fail, since the
 * numbers are still comparable between cases in the same run.
 */
export function forceCollection(): void {
	globalThis.gc?.();
}

export type GcTotals = {
	count: number;
	pauseMs: number;
};

/**
 * Whether this runtime actually delivers `"gc"` performance entries.
 *
 * `PerformanceObserver.supportedEntryTypes` lists `"gc"` on builds that never
 * emit one — Node 26.8 does, and reports nothing even for a forced collection.
 * Reporting the resulting zero as "no collections ran" would be a lie, so the
 * capability is probed rather than assumed.
 */
export function canObserveGc(): boolean {
	if (!PerformanceObserver.supportedEntryTypes.includes("gc")) {
		return false;
	}

	const probe = new PerformanceObserver(() => {});
	try {
		probe.observe({ entryTypes: ["gc"] });
		forceCollection();

		return probe.takeRecords().length > 0;
	} finally {
		probe.disconnect();
	}
}

/**
 * Running totals of the collections observed since construction, or `null`
 * where {@link canObserveGc} says the runtime cannot report them.
 *
 * A class because it owns a subscription that outlives any one reading: the
 * observer must stay attached across every batch, and callers difference two
 * readings rather than restarting it.
 */
export class GcRecorder {
	private readonly observer: PerformanceObserver | null;
	private count_ = 0;
	private pauseMs_ = 0;

	constructor(observable: boolean) {
		if (!observable) {
			this.observer = null;
			return;
		}

		this.observer = new PerformanceObserver((list) => {
			this.absorb_(list.getEntries());
		});
		this.observer.observe({ entryTypes: ["gc"] });
	}

	read(): GcTotals | null {
		if (!this.observer) {
			return null;
		}

		// The observer's callback runs on the microtask queue, and a synchronous
		// case never yields to it — so without draining here, a batch that
		// collected repeatedly would report no collections at all.
		this.absorb_(this.observer.takeRecords());

		return { count: this.count_, pauseMs: this.pauseMs_ };
	}

	[Symbol.dispose](): void {
		this.observer?.disconnect();
	}

	private absorb_(entries: readonly PerformanceEntry[]): void {
		for (let index = 0; index < entries.length; index++) {
			this.count_++;
			this.pauseMs_ += entries[index]!.duration;
		}
	}
}

export function gcSince(
	before: GcTotals | null,
	after: GcTotals | null,
): GcTotals | null {
	if (before === null || after === null) {
		return null;
	}

	return {
		count: after.count - before.count,
		pauseMs: after.pauseMs - before.pauseMs,
	};
}
