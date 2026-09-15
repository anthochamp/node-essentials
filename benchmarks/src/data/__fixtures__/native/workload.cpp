// Reference workloads for the cross-language groups.
//
// Usage: workload <noop|queue|heap> <n>
//
// `noop` gives the harness the process startup cost to subtract. The checksum
// is printed so the caller can verify every language computed the same answer.

#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <deque>
#include <functional>
#include <queue>
#include <vector>

namespace
{

	constexpr std::uint32_t SEED = 0x2545F491u;

	std::uint32_t xorshift32(std::uint32_t state)
	{
		state ^= state << 13;
		state ^= state >> 17;
		state ^= state << 5;
		return state;
	}

	std::uint32_t queue_workload(std::uint32_t count)
	{
		std::deque<std::uint32_t> queue;
		std::uint32_t total = 0;
		for (std::uint32_t index = 0; index < count; ++index)
		{
			queue.push_back(index);
			if (index & 1u)
			{
				total += queue.front();
				queue.pop_front();
			}
		}
		while (!queue.empty())
		{
			total += queue.front();
			queue.pop_front();
		}
		return total;
	}

	std::uint32_t heap_workload(std::uint32_t count)
	{
		std::priority_queue<std::uint32_t, std::vector<std::uint32_t>,
												std::greater<std::uint32_t>>
				heap;
		std::uint32_t state = SEED;
		for (std::uint32_t index = 0; index < count; ++index)
		{
			state = xorshift32(state);
			heap.push(state);
		}
		std::uint32_t total = 0;
		while (!heap.empty())
		{
			total += heap.top();
			heap.pop();
		}
		return total;
	}

} // namespace

int main(int argc, char **argv)
{
	if (argc < 2)
	{
		std::fprintf(stderr, "usage: workload <noop|queue|heap> <n>\n");
		return 2;
	}

	const char *mode = argv[1];
	const std::uint32_t count =
			argc > 2 ? static_cast<std::uint32_t>(std::strtoul(argv[2], nullptr, 10))
							 : 0;

	if (std::strcmp(mode, "noop") == 0)
	{
		std::printf("0\n");
	}
	else if (std::strcmp(mode, "queue") == 0)
	{
		std::printf("%u\n", queue_workload(count));
	}
	else if (std::strcmp(mode, "heap") == 0)
	{
		std::printf("%u\n", heap_workload(count));
	}
	else
	{
		std::fprintf(stderr, "unknown mode: %s\n", mode);
		return 2;
	}

	return 0;
}
