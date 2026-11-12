---
title: "Binary search, stacks, heaps & intervals"
subtitle: "Order is information. Use it."
description: "One binary-search template for everything, monotonic stacks, heaps for top-K and medians, and the sort-then-sweep trick for intervals (P10–P20)."
date: 2026-11-12
track: dsa
weight: 3
---

These four patterns all exploit some kind of order. Binary search uses sorted data, or an answer space where "if X works, anything bigger works too". A monotonic stack keeps just the elements that can still matter. A heap keeps the best K without sorting everything. Interval problems almost always start with a sort by start time.

> [!TIP] The short version
> - **Binary search on the answer** is the SDE2 favourite: "minimise the maximum", "smallest speed that works".
> - **Monotonic stack:** next greater or smaller element, histograms. Every element is pushed and popped once.
> - **Heap:** top K with a min-heap of size K, merge K sorted lists, running median with two heaps.
> - **Intervals:** sort by start, then sweep.

## Binary Search

**Use when:** the data is sorted, **or** the answer space is monotonic ("if X works, everything bigger than X works too"). The second case, *binary search on the answer*, is the one SDE2 interviews like to test.

**Template (find the first index where `condition` is true):**
```java
int lo = 0, hi = n;                 // hi = n means "not found"
while (lo < hi) {
    int mid = lo + (hi - lo) / 2;
    if (condition(mid)) hi = mid;   // mid might be the answer; keep it
    else lo = mid + 1;
}
return lo;
```
This one template covers lower bound, upper bound, first true, and minimising an answer. It has no off-by-one traps if you keep `[lo, hi)` consistent.

### P10. Search in Rotated Sorted Array
**Idea:** at any `mid`, one half is sorted. Check whether the target lies in the sorted half. If so, search there; otherwise search the other half.

```java
int search(int[] nums, int target) {
    int lo = 0, hi = nums.length - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) return mid;
        if (nums[lo] <= nums[mid]) {                       // left half sorted
            if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
            else lo = mid + 1;
        } else {                                           // right half sorted
            if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
            else hi = mid - 1;
        }
    }
    return -1;
}
```
**Complexity:** O(log n). **Variant:** find the minimum in a rotated array (compare `nums[mid]` with `nums[hi]`).

### P11. Koko Eating Bananas (binary search on the answer)
Find the minimum eating speed `k` that finishes all piles within `h` hours.

**Idea:** if speed `k` works, any faster speed also works, so the condition is monotonic. Binary search `k` in `[1, max(pile)]`.

```java
int minEatingSpeed(int[] piles, int h) {
    int lo = 1, hi = Arrays.stream(piles).max().getAsInt();
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (hoursNeeded(piles, mid) <= h) hi = mid; else lo = mid + 1;
    }
    return lo;
}
long hoursNeeded(int[] piles, int k) {
    long hours = 0;
    for (int p : piles) hours += (p + k - 1) / k;          // ceil division
    return hours;
}
```
**Complexity:** O(n log max).

**The same shape appears in:** capacity to ship packages within D days, split array largest sum, minimum days to make bouquets, and "the minimum number of delivery partners needed to finish all orders within T".


## Stack and Monotonic Stack

**A monotonic stack** keeps elements in increasing or decreasing order. Every element is pushed and popped once, so the whole pass is O(n). It answers "the next or previous greater or smaller element" for every index.

### P12. Valid Parentheses
```java
boolean isValid(String s) {
    Deque<Character> stack = new ArrayDeque<>();
    for (char c : s.toCharArray()) {
        if (c == '(') stack.push(')');
        else if (c == '[') stack.push(']');
        else if (c == '{') stack.push('}');
        else if (stack.isEmpty() || stack.pop() != c) return false;
    }
    return stack.isEmpty();
}
```

### P13. Daily Temperatures (next greater element)
For each day, how many days until a warmer temperature?

```java
int[] dailyTemperatures(int[] t) {
    int[] res = new int[t.length];
    Deque<Integer> stack = new ArrayDeque<>();             // indices, temperatures decreasing
    for (int i = 0; i < t.length; i++) {
        while (!stack.isEmpty() && t[i] > t[stack.peek()]) {
            int j = stack.pop();
            res[j] = i - j;
        }
        stack.push(i);
    }
    return res;
}
```
**Complexity:** O(n).

### P14. Largest Rectangle in Histogram
**Idea:** for each bar, find how far it can extend left and right while every bar in between is at least as tall. Keep a stack of indices with increasing heights. When a shorter bar arrives, pop and compute the area for the popped bar.

```java
int largestRectangleArea(int[] heights) {
    Deque<Integer> stack = new ArrayDeque<>();
    int best = 0, n = heights.length;
    for (int i = 0; i <= n; i++) {
        int h = (i == n) ? 0 : heights[i];                 // sentinel flushes the stack
        while (!stack.isEmpty() && h < heights[stack.peek()]) {
            int height = heights[stack.pop()];
            int leftBoundary = stack.isEmpty() ? -1 : stack.peek();
            best = Math.max(best, height * (i - leftBoundary - 1));
        }
        stack.push(i);
    }
    return best;
}
```
**Complexity:** O(n). **Extension:** maximal rectangle in a binary matrix (run this on the histogram for each row).

### P15. Sliding Window Maximum (monotonic deque)
**Idea:** the deque holds indices with decreasing values. The front is the maximum of the current window. Drop indices that have left the window from the front.

```java
int[] maxSlidingWindow(int[] nums, int k) {
    int[] res = new int[nums.length - k + 1];
    Deque<Integer> dq = new ArrayDeque<>();
    for (int i = 0; i < nums.length; i++) {
        if (!dq.isEmpty() && dq.peekFirst() <= i - k) dq.pollFirst();       // out of window
        while (!dq.isEmpty() && nums[dq.peekLast()] <= nums[i]) dq.pollLast(); // useless smaller ones
        dq.offerLast(i);
        if (i >= k - 1) res[i - k + 1] = nums[dq.peekFirst()];
    }
    return res;
}
```
**Complexity:** O(n).


## Heap / Priority Queue

**Use when:** you need **top K**, the K-th element, to merge K sorted streams, or a running median. To find the K largest, keep a **min-heap of size K**, which gives O(n log k).

### P16. Kth Largest Element
```java
int findKthLargest(int[] nums, int k) {
    PriorityQueue<Integer> minHeap = new PriorityQueue<>();
    for (int n : nums) {
        minHeap.offer(n);
        if (minHeap.size() > k) minHeap.poll();
    }
    return minHeap.peek();
}
```
**Complexity:** O(n log k). **Follow-up:** Quickselect gives O(n) on average (O(n²) worst case, which randomisation avoids in practice).

### P17. Top K Frequent Elements
```java
int[] topKFrequent(int[] nums, int k) {
    Map<Integer, Integer> freq = new HashMap<>();
    for (int n : nums) freq.merge(n, 1, Integer::sum);
    PriorityQueue<Map.Entry<Integer, Integer>> heap =
            new PriorityQueue<>(Comparator.comparingInt(Map.Entry::getValue));
    for (var e : freq.entrySet()) {
        heap.offer(e);
        if (heap.size() > k) heap.poll();
    }
    return heap.stream().mapToInt(Map.Entry::getKey).toArray();
}
```
**Complexity:** O(n log k). **O(n) alternative:** bucket sort by frequency (index = count).

**SDE2 follow-up, "top K over a stream across many servers":** each node computes its local top-K and a coordinator merges them. Note that this is only exact if you also bring along the counts for candidates, or use Count-Min Sketch plus a heap for an approximate answer.

### P18. Merge K Sorted Lists
```java
ListNode mergeKLists(ListNode[] lists) {
    PriorityQueue<ListNode> pq = new PriorityQueue<>(Comparator.comparingInt(n -> n.val));
    for (ListNode l : lists) if (l != null) pq.offer(l);
    ListNode dummy = new ListNode(0), tail = dummy;
    while (!pq.isEmpty()) {
        ListNode node = pq.poll();
        tail.next = node; tail = node;
        if (node.next != null) pq.offer(node.next);
    }
    return dummy.next;
}
```
**Complexity:** O(N log k), where N is the total number of nodes. **The same idea** powers external merge sort, merging sorted log files, and k-way merges in LSM-tree databases.

### P19. Find Median from Data Stream (two heaps)
**Idea:** a max-heap holds the lower half and a min-heap holds the upper half. Keep their sizes balanced (the lower half may have one extra).

```java
class MedianFinder {
    private final PriorityQueue<Integer> low = new PriorityQueue<>(Comparator.reverseOrder());
    private final PriorityQueue<Integer> high = new PriorityQueue<>();

    void addNum(int num) {
        low.offer(num);
        high.offer(low.poll());                            // move the largest of low to high
        if (high.size() > low.size()) low.offer(high.poll());
    }
    double findMedian() {
        return low.size() > high.size() ? low.peek() : (low.peek() + (long) high.peek()) / 2.0;
    }
}
```
**Complexity:** O(log n) to add, O(1) for the median.


## Intervals

**Use when:** you have ranges such as meetings, bookings or delivery slots. Almost always **sort by start**, then sweep.

### P20. Merge Intervals and Meeting Rooms II
```java
// Merge overlapping intervals
int[][] merge(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
    List<int[]> res = new ArrayList<>();
    for (int[] cur : intervals) {
        if (res.isEmpty() || res.get(res.size() - 1)[1] < cur[0]) res.add(cur);
        else res.get(res.size() - 1)[1] = Math.max(res.get(res.size() - 1)[1], cur[1]);
    }
    return res.toArray(new int[0][]);
}

// Minimum meeting rooms (= max number of overlapping intervals at any time)
int minMeetingRooms(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
    PriorityQueue<Integer> endTimes = new PriorityQueue<>();
    for (int[] in : intervals) {
        if (!endTimes.isEmpty() && endTimes.peek() <= in[0]) endTimes.poll(); // reuse a room
        endTimes.offer(in[1]);
    }
    return endTimes.size();
}
```
**Complexity:** O(n log n) for both.

**Related problems:** insert interval, non-overlapping intervals (greedy: sort by end, P46), employee free time. A **sweep line** (+1 at each start, −1 at each end, sorted) also gives the maximum concurrency, for example "the peak number of concurrent orders per restaurant".
