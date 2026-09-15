/**
 * How a {@link DecodeDriver} waits when a decoder returns `pending` (a value
 * only silence delimits).
 *
 * A driver's relationship to time, not its liveness, decides which variant
 * applies — a finished buffer and a live transport both need an answer to "how
 * long is silence", they just answer it differently.
 */
export type IdlePolicy =
	/**
	 * No more input is ever coming: silence is already infinite. Re-decode
	 * immediately with `timedOut: true`; a still-`pending` result becomes `fatal`
	 * (truncation).
	 */
	| { readonly kind: "exhausted" }
	/**
	 * Wait `delayMs`, then invoke `run` to re-decode with `timedOut: true`.
	 * `schedule` is injected (not a bare `setTimeout`) so `DecodeDriver` stays
	 * portable and testable without a real clock; `net/core`'s `FrameLink` backs
	 * it with `@ac-kit/core`'s `Timer`.
	 *
	 * @returns A function that cancels the pending callback, called when new
	 *   input arrives before the timer fires.
	 */
	| {
			readonly kind: "timer";
			schedule(delayMs: number, run: () => void): () => void;
	  };
