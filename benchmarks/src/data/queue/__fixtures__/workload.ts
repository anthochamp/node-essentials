import { Queue } from "@ac-kit/data";

export function jsQueueWorkload(count: number): number {
	const queue = new Queue<number>();
	let sum = 0;
	for (let index = 0; index < count; index++) {
		queue.enqueue(index);
		if (index % 2 === 1) {
			sum = (sum + (queue.dequeue() ?? 0)) >>> 0;
		}
	}
	for (let item = queue.dequeue(); item !== undefined; item = queue.dequeue()) {
		sum = (sum + item) >>> 0;
	}
	return sum;
}

export function jsCustomQueueWorkload(count: number): number {
	const array: number[] = [];
	let head = 0;
	let sum = 0;
	for (let index = 0; index < count; index++) {
		array.push(index);
		if (index % 2 === 1) {
			sum = (sum + array[head++]!) >>> 0;
		}
	}
	while (head < array.length) {
		sum = (sum + array[head++]!) >>> 0;
	}
	return sum;
}
