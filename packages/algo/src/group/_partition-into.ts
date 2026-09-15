import { Predicate } from "@ac-kit/core";

export function partitionInto<T, R>(
	iterable: Iterable<T>,
	predicate: Predicate<[T]>,
	select: (item: T, index: number) => R,
): [R[], R[]] {
	const matching: R[] = [];
	const nonMatching: R[] = [];

	let index = 0;
	for (const item of iterable) {
		(predicate(item) ? matching : nonMatching).push(select(item, index));
		index++;
	}

	return [matching, nonMatching];
}
