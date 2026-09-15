import { MeasureData, ParentMessage } from "@ac-bench/core/runner";
import { MemorySink, ReportDiagnostic } from "@ac-kit/app-report";
import { describe, expect, it } from "vitest";

import { IpcReportReceiver } from "./ipc-report-receiver.js";

type Harness = {
	receiver: IpcReportReceiver;
	sent: ParentMessage[];
	diagnostics: ReportDiagnostic[];
	sink: MemorySink<MeasureData>;
};

function harness_(send?: (message: ParentMessage) => Promise<void>): Harness {
	const sent: ParentMessage[] = [];
	const diagnostics: ReportDiagnostic[] = [];
	const sink = new MemorySink<MeasureData>();

	const receiver = new IpcReportReceiver({
		sink,
		send: (message) => {
			sent.push(message);
			return send?.(message);
		},
		onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
		onProtocolFailure: () => {},
		ackEvery: 1,
	});

	return { receiver, sent, diagnostics, sink };
}

function event_(seq: number): unknown {
	return {
		t: "event",
		seq,
		event: {
			kind: "data",
			timestamp: 0,
			scopeId: null,
			data: { kind: "load-error", file: "a.bench.ts", message: "boom" },
		},
	};
}

describe("IpcReportReceiver", () => {
	it("should not renew the credit of a child that reported it was done", async () => {
		const { receiver, sent } = harness_();

		await receiver.receive(event_(1));
		await receiver.receive({ t: "done", seq: 2, status: "ok" });

		expect(receiver.status).toBe("ok");
		expect(sent).toEqual([{ t: "ack", seq: 1 }]);
	});

	it("should not renew the credit of a child that reported a fatal error", async () => {
		const { receiver, sent } = harness_();

		await receiver.receive({ t: "fatal", seq: 1, error: "boom" });

		expect(sent).toEqual([]);
	});

	it("should report a failed ack as a warning rather than throwing", async () => {
		const epipe = new Error("write EPIPE");
		const { receiver, diagnostics } = harness_(() => Promise.reject(epipe));

		await expect(receiver.receive(event_(1))).resolves.toBeUndefined();
		expect(diagnostics).toEqual([
			{
				severity: "warning",
				code: "ack-failed",
				message: expect.stringContaining("write EPIPE"),
			},
		]);
	});
});
