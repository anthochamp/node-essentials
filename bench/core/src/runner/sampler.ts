/** Why a case stopped taking samples. */
export type StopReason =
	| "policy-satisfied"
	| "min-time"
	| "max-time"
	| "max-runs"
	| "cancelled"
	| "failure";

export type StoppingDecision =
	| { kind: "continue"; suggestedSamples?: number }
	| { kind: "satisfied"; reason?: StopReason };

/**
 * The judgement half of sampling: when is this enough.
 *
 * A policy never sees the bounds. It answers only "is the evidence good enough
 * yet", and the driver reconciles that answer with the floors and ceilings —
 * which is what lets one driver serve a confidence-interval policy and a
 * deterministic-counter policy without knowing the difference.
 */
export type StoppingPolicy<TSample = number, TMetadata = unknown> = {
	/** Samples taken before the policy is consulted at all. */
	readonly pilotSamples: number;

	/** Consulted at each batch boundary, once the floors are met. */
	evaluate(samples: readonly TSample[]): StoppingDecision;

	/** Policy-specific fields merged into the result. */
	describe(samples: readonly TSample[]): TMetadata;
};

export type SamplingBounds = {
	/** Lower bound on measured iterations per case. */
	minRuns: number;

	/**
	 * Upper bound on measured iterations per case.
	 *
	 * With an error target driving the loop this is a safety net rather than the
	 * primary control.
	 */
	maxRuns: number;

	/**
	 * Keep sampling until this much time has been spent measuring, so fast cases
	 * get enough samples to be meaningful.
	 *
	 * A floor that dominates the controller would make the controller pointless.
	 */
	minTimeMs: number;

	/**
	 * Stop sampling once this much time has been spent, so slow cases do not run
	 * for minutes.
	 */
	maxTimeMs: number;
};

export type SamplerResult<TSample = number, TMetadata = unknown> = {
	samples: TSample[];
	stopReason: StopReason;
	batches: number;
	/** Wall time the scheduler spent on this case, as reported by the caller. */
	activeMs: number;
	metadata: TMetadata;
};

export type SamplerOptions<TSample> = {
	readonly bounds: SamplingBounds;

	/** Optional signal to cancel the sampling loop. */
	readonly signal?: AbortSignal;

	/**
	 * Measured cost of one sample, used to size the next batch. Defaults to the
	 * mean observed `activeMs` per sample, which needs no knowledge of `TSample`
	 * but includes the caller's own per-batch work.
	 */
	readonly costOf?: (sample: TSample) => number;

	/** Measured work one batch should amount to. Default 5. */
	readonly targetBatchMs?: number;
};

/** A batch is one scheduling quantum, so its size fixes the reporting rate. */
const TARGET_BATCH_MS_ = 5;

/** Guards the division when an operation is too fast to time individually. */
const EPSILON_MS_ = 1e-6;

/**
 * Drives sampling without owning a clock, a loop, or an opinion about when
 * enough is enough.
 *
 * Time is an input rather than something read from a clock inside, which is
 * what makes the whole apparatus testable from a scripted sequence with no fake
 * timers — and what lets a scheduler hand this case a slice, walk away to
 * another case, and come back.
 */
export class Sampler<TSample = number, TMetadata = unknown> {
	private readonly collected: TSample[] = [];
	private readonly targetBatchMs: number;
	private batches = 0;
	private activeMs = 0;
	private stopReason: StopReason | null = null;
	private suggested: number | null = null;

	constructor(
		private readonly policy: StoppingPolicy<TSample, TMetadata>,
		private readonly options: SamplerOptions<TSample>,
	) {
		this.targetBatchMs = options.targetBatchMs ?? TARGET_BATCH_MS_;
	}

	/** `null` once this case is done; otherwise the size of the next batch. */
	nextBatch(): number | null {
		if (this.stopReason !== null) {
			return null;
		}

		if (this.options.signal?.aborted === true) {
			this.stopReason = "cancelled";
			return null;
		}

		const { bounds } = this.options;
		const taken = this.collected.length;

		if (taken === 0) {
			return Math.max(1, Math.min(this.policy.pilotSamples, bounds.maxRuns));
		}

		if (taken >= bounds.maxRuns) {
			this.stopReason = "max-runs";
			return null;
		}

		if (this.activeMs >= bounds.maxTimeMs) {
			this.stopReason = "max-time";
			return null;
		}

		if (taken >= bounds.minRuns && this.activeMs >= bounds.minTimeMs) {
			const decision = this.policy.evaluate(this.collected);

			if (decision.kind === "satisfied") {
				this.stopReason = decision.reason ?? "policy-satisfied";
				return null;
			}

			this.suggested = decision.suggestedSamples ?? null;
		}

		return this.sizeBatch_(taken);
	}

	/**
	 * Feeds one batch back. `activeMs` is the wall time the scheduler spent on
	 * this slice, including hooks and this recomputation.
	 */
	observe(samples: readonly TSample[], activeMs: number): void {
		this.collected.push(...samples);
		this.activeMs += activeMs;
		this.batches += 1;
	}

	/** Ends sampling early, keeping whatever was collected. */
	stop(reason: Extract<StopReason, "cancelled" | "failure">): void {
		this.stopReason ??= reason;
	}

	/** Defined only once {@link Sampler.nextBatch} has returned `null`. */
	result(): SamplerResult<TSample, TMetadata> {
		return {
			samples: [...this.collected],
			stopReason: this.stopReason ?? "policy-satisfied",
			batches: this.batches,
			activeMs: this.activeMs,
			metadata: this.policy.describe(this.collected),
		};
	}

	private sizeBatch_(taken: number): number {
		const { bounds } = this.options;
		const costMs = Math.max(this.meanCostMs_(), EPSILON_MS_);

		const remaining = Math.min(
			bounds.maxRuns - taken,
			Math.max(1, Math.floor((bounds.maxTimeMs - this.activeMs) / costMs)),
		);

		const wanted = this.suggested ?? Math.ceil(this.targetBatchMs / costMs);

		return Math.max(1, Math.min(wanted, remaining));
	}

	private meanCostMs_(): number {
		const { costOf } = this.options;

		if (costOf === undefined) {
			return this.activeMs / Math.max(1, this.collected.length);
		}

		let total = 0;
		for (let index = 0; index < this.collected.length; index++) {
			total += costOf(this.collected[index]!);
		}

		return total / Math.max(1, this.collected.length);
	}
}
