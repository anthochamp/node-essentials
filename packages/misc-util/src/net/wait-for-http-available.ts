import { sleep } from "../async/sleep.js";

const kDefaultCheckIntervalMs = 50;

export async function waitForHttpAvailable(
	input: string | URL,
	timeoutMs: number,
	options?: { checkIntervalMs?: number },
) {
	const time0 = Date.now();
	do {
		let success = false;
		try {
			await fetch(input, {
				redirect: "manual",
			});

			success = true;
		} catch (_) {
			success = false;
		}

		if (success) break;
		await sleep(options?.checkIntervalMs ?? kDefaultCheckIntervalMs);
	} while (Date.now() - time0 < timeoutMs);
}
