---
title: "The DSA playbook"
subtitle: "Fifteen patterns, not a thousand problems."
description: "What an SDE2 coding round expects, the six-step routine for every problem, a cheat sheet that maps problem shapes to patterns, and a four-week plan."
date: 2026-11-12
track: dsa
weight: 1
---

There are thousands of LeetCode problems and roughly fifteen patterns behind them. Recognise the pattern and you're most of the way to the solution; the rest of the hour is about showing the interviewer *how* you got there. Everything in this track is in Java, and every snippet is a template you should be able to write from memory.

> [!TIP] The short version
> - **The bar:** an optimal solution with few hints, talked through out loud, tested by you before the interviewer asks.
> - **The routine:** clarify → examples → brute force → optimise → code → test.
> - **Input size tells you the target complexity.** n ≤ 10⁶ means O(n log n) or better.
> - **Practise without AI**, timed and out loud. That's the only practice that transfers.

## What an SDE2 DSA round expects

| Signal | SDE1 bar | SDE2 bar |
|--------|----------|----------|
| Solve | Reaches a working solution, maybe with hints | Reaches an optimal or near-optimal solution with few or no hints |
| Communication | Thinks silently, then codes | Clarifies, states the brute force, improves it out loud, then codes |
| Code quality | Works | Clean names, helper functions, no copy-paste, handles edge cases |
| Testing | Runs the given example | Dry-runs edge cases on their own (empty input, one element, duplicates, overflow) |
| Complexity | States it when asked | States time and space unprompted, and explains the trade-offs |
| Follow-ups | Struggles | Handles "what if the data doesn't fit in memory / is streaming / is concurrent?" |

Typical format: 45 to 60 minutes, 1 or 2 problems, mostly **medium**, sometimes one medium plus a hard follow-up.

## The 6-step interview routine

1. **Clarify (2–3 min):** input size, ranges, negatives, duplicates, sorted or not, empty input, what to return when no answer exists.
2. **Examples:** make up one normal and one edge case.
3. **Brute force:** state it and its complexity in one sentence. Don't code it.
4. **Optimise:** find the bottleneck and map it to a pattern (table below). Agree on the approach before coding.
5. **Code:** clean, modular, explaining as you go.
6. **Test:** dry-run your example and edge cases, fix bugs, then state the final time and space complexity.

## Pattern recognition cheat sheet

| If you see… | Think… | Note |
|-------------|--------|------|
| "Find pair or triplet with sum", sorted array | Two pointers | [Arrays, hashing & windows](/study/dsa/arrays-hashing-and-windows/) |
| Fast lookups, counting, deduplication | HashMap / HashSet | [Arrays, hashing & windows](/study/dsa/arrays-hashing-and-windows/) |
| Longest or shortest **contiguous** subarray or substring meeting a condition | Sliding window | [Arrays, hashing & windows](/study/dsa/arrays-hashing-and-windows/) |
| Subarray sum equals K, range sums | Prefix sum + HashMap | [Arrays, hashing & windows](/study/dsa/arrays-hashing-and-windows/) |
| Sorted data, or "minimise the maximum" / "smallest X that works" | Binary search (on the index or on the answer) | [Binary search, stacks, heaps & intervals](/study/dsa/binary-search-stacks-heaps-intervals/) |
| Next greater or smaller element, histogram problems | Monotonic stack | [Binary search, stacks, heaps & intervals](/study/dsa/binary-search-stacks-heaps-intervals/) |
| Top K, K-th largest, merge K sorted, running median | Heap / priority queue | [Binary search, stacks, heaps & intervals](/study/dsa/binary-search-stacks-heaps-intervals/) |
| Overlapping ranges, meetings, bookings | Sort by start + sweep | [Binary search, stacks, heaps & intervals](/study/dsa/binary-search-stacks-heaps-intervals/) |
| Linked list cycle, middle node | Fast and slow pointers | [Linked lists, trees & graphs](/study/dsa/lists-trees-and-graphs/) |
| Tree path, depth, subtree properties | DFS recursion (return info from children) | [Linked lists, trees & graphs](/study/dsa/lists-trees-and-graphs/) |
| Level by level, shortest path in an **unweighted** graph | BFS | [Linked lists, trees & graphs](/study/dsa/lists-trees-and-graphs/) |
| Dependencies, ordering, "can all courses be finished?" | Topological sort | [Linked lists, trees & graphs](/study/dsa/lists-trees-and-graphs/) |
| Shortest path with **weights** | Dijkstra | [Linked lists, trees & graphs](/study/dsa/lists-trees-and-graphs/) |
| Connectivity, grouping, "are these connected?" | Union-Find | [Designing data structures](/study/dsa/designing-data-structures/) |
| Count ways, min/max cost, "can we reach?" with overlapping subproblems | Dynamic programming | [DP, backtracking & greedy](/study/dsa/dp-backtracking-greedy/) |
| All subsets, permutations or combinations | Backtracking | [DP, backtracking & greedy](/study/dsa/dp-backtracking-greedy/) |
| A locally optimal choice is provably globally optimal | Greedy | [DP, backtracking & greedy](/study/dsa/dp-backtracking-greedy/) |
| Prefix matching, autocomplete | Trie | [Designing data structures](/study/dsa/designing-data-structures/) |
| "Design a data structure with O(1) X and Y" | HashMap plus another structure | [Designing data structures](/study/dsa/designing-data-structures/) |

## Input size → target complexity

| n | Target | Typical approach |
|---|--------|------------------|
| ≤ 10 | O(n!) | Permutations, backtracking |
| ≤ 20 | O(2ⁿ) | Subsets, bitmask DP |
| ≤ 500 | O(n³) | Triple loop, interval DP |
| ≤ 5,000 | O(n²) | Double loop, 2D DP |
| ≤ 10⁶ | O(n log n) | Sorting, heap, binary search |
| ≤ 10⁸ or more | O(n) / O(log n) | Linear scan, math, binary search |

## Java toolbox

```java
// Collections you'll use constantly
Map<Integer, Integer> map = new HashMap<>();   map.merge(k, 1, Integer::sum);  map.getOrDefault(k, 0);
Set<Integer> set = new HashSet<>();
Deque<Integer> stack = new ArrayDeque<>();     stack.push(x); stack.pop(); stack.peek();
Deque<Integer> queue = new ArrayDeque<>();     queue.offer(x); queue.poll(); queue.peek();
PriorityQueue<Integer> minHeap = new PriorityQueue<>();
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());
PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0])); // never a[0]-b[0] (overflow)
TreeMap<Integer, Integer> tm = new TreeMap<>(); tm.floorKey(x); tm.ceilingKey(x); tm.firstKey();
Arrays.sort(arr); Arrays.fill(dp, -1); Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
StringBuilder sb = new StringBuilder();
int mid = lo + (hi - lo) / 2;                   // avoids overflow
long safe = (long) a * b;                       // overflow-safe product
```


## 4-week study plan (1.5–2 hrs a day)

| Week | Focus | Goal |
|------|-------|------|
| 1 | Arrays, hashing & windows; binary search, stacks, heaps & intervals | Write every template from memory. 3 or 4 extra problems per pattern on LeetCode |
| 2 | Linked lists, trees & graphs | Write BFS, DFS, topo sort, Dijkstra and Union-Find without looking |
| 3 | DP, backtracking & greedy | DP: always write the state and transition in English first, then the code |
| 4 | Designing data structures + mixed timed sets | Two 45-minute mock problems a day, talking out loud, **without AI** |

> [!NOTE] Where to practise next
> NeetCode 150, Blind 75 and Grind 75. The notes in this track cover the core of all three.
