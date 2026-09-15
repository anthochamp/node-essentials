import assert from "node:assert";
import { EventEmitter } from "node:events";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { Event } from "@ac-kit/async";

const EMITS = 20_000;
const LISTENERS = 4;
const WANTED = EMITS * LISTENERS;

durationCondition("Event dispatch — 20 000 emits to 4 listeners", () => {
	durationCase("@ac-kit/.Event", { tags: { kind: "js" } }, () => {
		const event = new Event<number>();
		let counter = 0;
		for (let index = 0; index < LISTENERS; index++) {
			event.subscribe(() => {
				counter++;
			});
		}
		for (let index = 0; index < EMITS; index++) {
			event.emit(index);
		}
		assert.strictEqual(counter, WANTED);
	});
	durationCase("EventEmitter", { tags: { kind: "native" } }, () => {
		const emitter = new EventEmitter();
		let counter = 0;
		for (let index = 0; index < LISTENERS; index++) {
			emitter.on("data", () => {
				counter++;
			});
		}
		for (let index = 0; index < EMITS; index++) {
			emitter.emit("data", index);
		}
		assert.strictEqual(counter, WANTED);
	});
	durationCase("EventTarget", { tags: { kind: "native" } }, () => {
		const target = new EventTarget();
		let counter = 0;
		for (let index = 0; index < LISTENERS; index++) {
			target.addEventListener("data", () => {
				counter++;
			});
		}
		for (let index = 0; index < EMITS; index++) {
			target.dispatchEvent(new CustomEvent("data", { detail: index }));
		}
		assert.strictEqual(counter, WANTED);
	});
});
