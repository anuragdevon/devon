---
title: "Arrays, hashing & windows"
subtitle: "Trade a little memory for a whole loop."
description: "Hashing, prefix sums, two pointers and sliding windows: the four patterns behind most array and string questions, with nine worked problems (P1–P9)."
date: 2026-11-12
track: dsa
weight: 2
---

Most first-round questions are about arrays or strings, and most of those fall to one of four ideas. A hash map removes an inner loop. A prefix sum turns a range into a subtraction. Two pointers squeeze a sorted array from both ends. A sliding window grows and shrinks over a contiguous run. Learn to spot which one the problem is asking for.

> [!TIP] The short version
> - **Hashing:** "have I seen X?" in O(1), at the cost of O(n) space.
> - **Prefix sum + map:** subarray sums, including negatives.
> - **Two pointers:** sorted input, pairs and triplets, both ends.
> - **Sliding window:** longest or shortest *contiguous* run that meets a condition. Not with negative sums.

## Hashing

**Use when:** you need O(1) lookups for "have I seen X?", "how many X?", or "where was X?". It trades O(n) space for removing an inner loop.

### P1. Two Sum
Return the indices of two numbers that add up to `target`.

**Idea:** for each `x`, check whether `target - x` has already been seen.

```java
int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>();          // value -> index
    for (int i = 0; i < nums.length; i++) {
        Integer j = seen.get(target - nums[i]);
        if (j != null) return new int[]{j, i};
        seen.put(nums[i], i);
    }
    return new int[]{-1, -1};
}
```
**Complexity:** O(n) time, O(n) space.

**Follow-ups:** If the array is sorted, use two pointers for O(1) space. To return all pairs without duplicates, sort and use two pointers, skipping duplicates.

### P2. Group Anagrams
Group strings that are anagrams of each other.

**Idea:** anagrams share a canonical key, either the sorted characters or a 26-count signature.

```java
List<List<String>> groupAnagrams(String[] strs) {
    Map<String, List<String>> groups = new HashMap<>();
    for (String s : strs) {
        int[] count = new int[26];
        for (char c : s.toCharArray()) count[c - 'a']++;
        String key = Arrays.toString(count);               // O(k) key instead of O(k log k) sort
        groups.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
    }
    return new ArrayList<>(groups.values());
}
```
**Complexity:** O(n·k) time and space, where k is the string length.

### P3. Longest Consecutive Sequence
Find the length of the longest run of consecutive integers in O(n).

**Idea:** put all numbers in a set. Only start counting from numbers that begin a sequence (`x-1` is not in the set).

```java
int longestConsecutive(int[] nums) {
    Set<Integer> set = new HashSet<>();
    for (int n : nums) set.add(n);
    int best = 0;
    for (int n : set) {
        if (set.contains(n - 1)) continue;                 // not a sequence start
        int len = 1;
        while (set.contains(n + len)) len++;
        best = Math.max(best, len);
    }
    return best;
}
```
**Complexity:** O(n). Each number is visited at most twice.


## Prefix Sum

**Use when:** you need range sums, or to count subarrays with a given sum. `sum(i..j) = prefix[j+1] - prefix[i]`.

### P4. Subarray Sum Equals K
Count the subarrays whose sum is exactly `k`. The array can contain negatives, so a sliding window does **not** work.

**Idea:** if `prefix[j] - prefix[i] = k`, then we need to know how many earlier prefixes equal `prefix[j] - k`.

```java
int subarraySum(int[] nums, int k) {
    Map<Integer, Integer> freq = new HashMap<>();
    freq.put(0, 1);                                        // empty prefix
    int sum = 0, count = 0;
    for (int n : nums) {
        sum += n;
        count += freq.getOrDefault(sum - k, 0);
        freq.merge(sum, 1, Integer::sum);
    }
    return count;
}
```
**Complexity:** O(n) time and space.

**Variants:** longest subarray with sum k (store the *first* index of each prefix), subarray sum divisible by k (use `((sum % k) + k) % k` as the key), 2D prefix sums for matrix region queries.

### P5. Product of Array Except Self (no division)
**Idea:** answer[i] = (product of everything to the left) × (product of everything to the right). Do two passes.

```java
int[] productExceptSelf(int[] nums) {
    int n = nums.length;
    int[] res = new int[n];
    res[0] = 1;
    for (int i = 1; i < n; i++) res[i] = res[i - 1] * nums[i - 1];   // left products
    int right = 1;
    for (int i = n - 1; i >= 0; i--) { res[i] *= right; right *= nums[i]; }
    return res;
}
```
**Complexity:** O(n) time, O(1) extra space (the output array doesn't count).


## Two Pointers

**Use when:** the data is sorted (or you can sort it), you're looking for pairs or triplets, or you need to partition or compare from both ends.

### P6. 3Sum
Find all unique triplets that sum to 0.

**Idea:** sort the array. Fix `i`, then use two pointers on the rest. Skip duplicates at every level.

```java
List<List<Integer>> threeSum(int[] nums) {
    Arrays.sort(nums);
    List<List<Integer>> res = new ArrayList<>();
    for (int i = 0; i < nums.length - 2; i++) {
        if (i > 0 && nums[i] == nums[i - 1]) continue;     // skip duplicate anchor
        if (nums[i] > 0) break;                            // remaining are all positive
        int lo = i + 1, hi = nums.length - 1;
        while (lo < hi) {
            int sum = nums[i] + nums[lo] + nums[hi];
            if (sum < 0) lo++;
            else if (sum > 0) hi--;
            else {
                res.add(List.of(nums[i], nums[lo], nums[hi]));
                while (lo < hi && nums[lo] == nums[lo + 1]) lo++;
                while (lo < hi && nums[hi] == nums[hi - 1]) hi--;
                lo++; hi--;
            }
        }
    }
    return res;
}
```
**Complexity:** O(n²) time, O(1) extra space (ignoring the sort).

### P7. Container With Most Water
**Idea:** start with the widest container. The shorter wall limits the area, so moving the taller wall inward can never help. Always move the shorter one.

```java
int maxArea(int[] h) {
    int lo = 0, hi = h.length - 1, best = 0;
    while (lo < hi) {
        best = Math.max(best, Math.min(h[lo], h[hi]) * (hi - lo));
        if (h[lo] < h[hi]) lo++; else hi--;
    }
    return best;
}
```
**Complexity:** O(n). **Why it's correct (an interviewer may ask):** any container that uses the shorter wall with a closer partner is narrower and no taller, so we can safely discard that wall.


## Sliding Window

**Use when:** you want the longest or shortest **contiguous** subarray or substring that satisfies a condition, and the condition stays monotonic as the window grows or shrinks.

**Template (variable-size window):**
```java
int left = 0;
for (int right = 0; right < n; right++) {
    add(arr[right]);
    while (windowInvalid()) { remove(arr[left]); left++; }
    best = Math.max(best, right - left + 1);   // for "longest"; for "shortest", update inside the while loop
}
```

### P8. Longest Substring Without Repeating Characters
```java
int lengthOfLongestSubstring(String s) {
    Map<Character, Integer> lastSeen = new HashMap<>();
    int left = 0, best = 0;
    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        if (lastSeen.containsKey(c) && lastSeen.get(c) >= left) {
            left = lastSeen.get(c) + 1;                    // jump past the previous occurrence
        }
        lastSeen.put(c, right);
        best = Math.max(best, right - left + 1);
    }
    return best;
}
```
**Complexity:** O(n) time, O(alphabet) space.

### P9. Minimum Window Substring
Find the smallest window of `s` that contains every character of `t`, including duplicates.

**Idea:** expand `right` until the window is valid (`formed == required`), then shrink `left` as far as possible while it stays valid, recording the best window.

```java
String minWindow(String s, String t) {
    if (t.isEmpty() || s.length() < t.length()) return "";
    int[] need = new int[128];
    for (char c : t.toCharArray()) need[c]++;
    int required = t.length();                             // characters still missing
    int left = 0, bestLen = Integer.MAX_VALUE, bestStart = 0;
    for (int right = 0; right < s.length(); right++) {
        if (need[s.charAt(right)]-- > 0) required--;      // this char was needed
        while (required == 0) {
            if (right - left + 1 < bestLen) { bestLen = right - left + 1; bestStart = left; }
            if (++need[s.charAt(left)] > 0) required++;   // removing a needed char
            left++;
        }
    }
    return bestLen == Integer.MAX_VALUE ? "" : s.substring(bestStart, bestStart + bestLen);
}
```
**Complexity:** O(|s| + |t|).

**Related problems:** permutation in string / find all anagrams (a fixed-size window with counts), longest substring with at most K distinct characters, longest repeating character replacement (`windowLen - maxFreq <= k`).


## Common mistakes

> [!WARNING] Watch out for
> - Using a sliding window when there are **negative numbers** in a sum problem. Use prefix sums.
> - Forgetting `freq.put(0, 1)` in prefix-sum counting.
> - Not skipping duplicates in kSum problems.
> - Integer overflow in sums and products. Use `long`.
