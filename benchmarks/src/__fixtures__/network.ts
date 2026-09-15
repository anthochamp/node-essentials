import { getRandomEphemeralPort } from "@ac-kit/core";

/** Endpoints the benchmarks connect to, overridable for a remote server. */
export const endpoints = {
	host: "127.0.0.1",
	smtpPort: getRandomEphemeralPort(),
	pop3Port: getRandomEphemeralPort(),
	imapPort: getRandomEphemeralPort(),
	netstringPort: getRandomEphemeralPort(),
	user: "bench",
	password: "bench",
	mailbox: "bench@example.test",
};

export const NETWORK_OPTIONS = {
	warmup: 3,
	minRuns: Number(process.env.BENCH_NET_MIN_RUNS ?? 10),
	maxRuns: Number(process.env.BENCH_NET_MAX_RUNS ?? 50),
	minTimeMs: Number(process.env.BENCH_NET_MIN_TIME_MS ?? 3_000),
	maxTimeMs: Number(process.env.BENCH_NET_MAX_TIME_MS ?? 20_000),
};
