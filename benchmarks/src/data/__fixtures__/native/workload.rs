// Reference workloads for the cross-language groups.
//
// Usage: workload <noop|queue|heap> <n>
//
// `noop` gives the harness the process startup cost to subtract. The checksum
// is printed so the caller can verify every language computed the same answer.

use std::cmp::Reverse;
use std::collections::{BinaryHeap, VecDeque};
use std::process::ExitCode;

const SEED: u32 = 0x2545_F491;

fn xorshift32(mut state: u32) -> u32 {
	state ^= state << 13;
	state ^= state >> 17;
	state ^= state << 5;
	state
}

fn queue_workload(count: u32) -> u32 {
	let mut queue: VecDeque<u32> = VecDeque::new();
	let mut total: u32 = 0;
	for index in 0..count {
		queue.push_back(index);
		if index & 1 == 1 {
			total = total.wrapping_add(queue.pop_front().unwrap_or(0));
		}
	}
	while let Some(value) = queue.pop_front() {
		total = total.wrapping_add(value);
	}
	total
}

fn heap_workload(count: u32) -> u32 {
	let mut heap: BinaryHeap<Reverse<u32>> = BinaryHeap::new();
	let mut state = SEED;
	for _ in 0..count {
		state = xorshift32(state);
		heap.push(Reverse(state));
	}
	let mut total: u32 = 0;
	while let Some(Reverse(value)) = heap.pop() {
		total = total.wrapping_add(value);
	}
	total
}

fn main() -> ExitCode {
	let args: Vec<String> = std::env::args().collect();
	let Some(mode) = args.get(1) else {
		eprintln!("usage: workload <noop|queue|heap> <n>");
		return ExitCode::from(2);
	};
	let count: u32 = args.get(2).and_then(|value| value.parse().ok()).unwrap_or(0);

	match mode.as_str() {
		"noop" => println!("0"),
		"queue" => println!("{}", queue_workload(count)),
		"heap" => println!("{}", heap_workload(count)),
		other => {
			eprintln!("unknown mode: {other}");
			return ExitCode::from(2);
		}
	}

	ExitCode::SUCCESS
}
