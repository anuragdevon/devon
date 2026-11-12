---
title: "DP, backtracking & greedy"
subtitle: "Say the state in words before you write it in code."
description: "A five-step framework for dynamic programming, the knapsack loop-direction rule, one backtracking template for subsets and permutations, and when greedy is provably safe (P34–P47)."
date: 2026-11-12
track: dsa
weight: 5
---

These are the patterns people fear, mostly because they try to jump straight to the code. Dynamic programming becomes manageable once you write the state and transition in plain English first. Backtracking is one template with a choose/explore/undo loop. Greedy is fast and simple, but only when you can argue that the local choice is globally safe.

> [!TIP] The short version
> - **DP:** state → transition → base cases → answer → order, then optimise space.
> - **Knapsack:** inner loop *backwards* for 0/1, *forwards* for unbounded.
> - **Backtracking:** make a choice, recurse, undo it. Prune early.
> - **Greedy:** justify it with an exchange argument, or fall back to DP.

## Dynamic programming: the framework and 1D problems

**Use when:** the problem asks for a count of ways, a minimum or maximum, or whether something is possible, **and** the choices create **overlapping subproblems** with **optimal substructure**.

**The framework (say it out loud in the interview):**
1. **State:** what does `dp[i]` (or `dp[i][j]`) mean, *in words*?
2. **Transition:** how does `dp[i]` follow from smaller states?
3. **Base cases.**
4. **Answer:** which state holds the final answer?
5. **Order:** compute top-down (memoised recursion) or bottom-up (a table). Then **optimise space** if each row depends only on the previous one.

> [!TIP] Top-down first
> Start top-down if it's easier to think about. Then mention, or convert to, bottom-up for no recursion overhead and O(1) or O(n) space.

### P34. Climbing Stairs and House Robber (1D DP)
```java
// Climbing stairs: dp[i] = dp[i-1] + dp[i-2]
int climbStairs(int n) {
    int a = 1, b = 1;                                      // ways to reach step 0 and step 1
    for (int i = 2; i <= n; i++) { int c = a + b; a = b; b = c; }
    return b;
}

// House robber: dp[i] = max(dp[i-1], dp[i-2] + nums[i])   (skip or rob house i)
int rob(int[] nums) {
    int prev2 = 0, prev1 = 0;
    for (int x : nums) { int cur = Math.max(prev1, prev2 + x); prev2 = prev1; prev1 = cur; }
    return prev1;
}
```
**Variant:** House Robber II (the houses form a circle) = max(rob without the first house, rob without the last).

### P35. Coin Change (unbounded knapsack, minimum count)
**State:** `dp[a]` = the fewest coins needed to make amount `a`. **Transition:** `dp[a] = min(dp[a - coin] + 1)`.

```java
int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, amount + 1);                           // acts as "infinity"
    dp[0] = 0;
    for (int a = 1; a <= amount; a++)
        for (int c : coins)
            if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
    return dp[amount] > amount ? -1 : dp[amount];
}
```
**Complexity:** O(amount × coins).

**Variant, Coin Change II (number of combinations):** loop **coins on the outside** so each combination is counted once regardless of order: `for c: for a = c..amount: dp[a] += dp[a-c]`.

### P36. Longest Increasing Subsequence
```java
// O(n²): dp[i] = length of the LIS ending at i
// O(n log n): tails[k] = smallest tail of any increasing subsequence of length k+1
int lengthOfLIS(int[] nums) {
    int[] tails = new int[nums.length];
    int size = 0;
    for (int x : nums) {
        int lo = 0, hi = size;
        while (lo < hi) { int mid = (lo + hi) >>> 1; if (tails[mid] < x) lo = mid + 1; else hi = mid; }
        tails[lo] = x;
        if (lo == size) size++;
    }
    return size;
}
```

## Dynamic programming: strings, knapsack and grids

### P37. Longest Common Subsequence (2D DP on two strings)
**State:** `dp[i][j]` = the LCS of `a[0..i)` and `b[0..j)`.

```java
int lcs(String a, String b) {
    int[][] dp = new int[a.length() + 1][b.length() + 1];
    for (int i = 1; i <= a.length(); i++)
        for (int j = 1; j <= b.length(); j++)
            dp[i][j] = a.charAt(i - 1) == b.charAt(j - 1)
                    ? dp[i - 1][j - 1] + 1
                    : Math.max(dp[i - 1][j], dp[i][j - 1]);
    return dp[a.length()][b.length()];
}
```
**This family includes:** edit distance, distinct subsequences, interleaving string, and diff tools such as `git diff`, which is built on LCS.

### P38. Edit Distance
```java
int minDistance(String a, String b) {
    int m = a.length(), n = b.length();
    int[][] dp = new int[m + 1][n + 1];
    for (int i = 0; i <= m; i++) dp[i][0] = i;             // delete everything
    for (int j = 0; j <= n; j++) dp[0][j] = j;             // insert everything
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++)
            dp[i][j] = a.charAt(i - 1) == b.charAt(j - 1)
                    ? dp[i - 1][j - 1]
                    : 1 + Math.min(dp[i - 1][j - 1],        // replace
                          Math.min(dp[i - 1][j],            // delete
                                   dp[i][j - 1]));          // insert
    return dp[m][n];
}
```
**Used in practice for:** fuzzy search, such as matching "panner tika" to "Paneer Tikka".

### P39. Partition Equal Subset Sum (0/1 knapsack)
**State:** `dp[s]` = whether some subset sums to `s`. Iterate `s` **backwards**, so each item is used at most once.

```java
boolean canPartition(int[] nums) {
    int total = Arrays.stream(nums).sum();
    if (total % 2 == 1) return false;
    int target = total / 2;
    boolean[] dp = new boolean[target + 1];
    dp[0] = true;
    for (int x : nums)
        for (int s = target; s >= x; s--)                  // backwards = 0/1; forwards = unbounded
            dp[s] |= dp[s - x];
    return dp[target];
}
```
**The knapsack rule to remember:** iterate the inner loop *backwards* for 0/1 (use each item once) and *forwards* for unbounded (reuse items).

### P40. Word Break
```java
boolean wordBreak(String s, List<String> wordDict) {
    Set<String> dict = new HashSet<>(wordDict);
    boolean[] dp = new boolean[s.length() + 1];            // dp[i]: s[0..i) can be segmented
    dp[0] = true;
    for (int i = 1; i <= s.length(); i++)
        for (int j = 0; j < i; j++)
            if (dp[j] && dict.contains(s.substring(j, i))) { dp[i] = true; break; }
    return dp[s.length()];
}
```
**Optimisation:** limit `j` to `i - maxWordLen`, or use a trie.

### P41. Unique Paths / Minimum Path Sum (grid DP)
```java
int minPathSum(int[][] g) {
    int m = g.length, n = g[0].length;
    int[] dp = new int[n];                                 // rolling row
    for (int i = 0; i < m; i++)
        for (int j = 0; j < n; j++) {
            if (i == 0 && j == 0) dp[j] = g[0][0];
            else if (i == 0) dp[j] = dp[j - 1] + g[i][j];
            else if (j == 0) dp[j] = dp[j] + g[i][j];
            else dp[j] = Math.min(dp[j], dp[j - 1]) + g[i][j];
        }
    return dp[n - 1];
}
```

**Other DP families to know by name:** interval DP (burst balloons, matrix-chain multiplication), DP on trees (house robber III), bitmask DP (travelling salesman for n ≤ 20), and stock buy/sell (a state machine: hold or not hold, cooldown).


## Backtracking

**Use when:** you need **all** combinations, permutations, subsets or placements, or must search with pruning (N-Queens, Sudoku). The complexity is exponential, so pruning is what matters.

**Template:**
```java
void backtrack(State state, List<Result> res) {
    if (isComplete(state)) { res.add(copy(state)); return; }
    for (Choice c : choices(state)) {
        if (!valid(c)) continue;          // prune
        make(c);
        backtrack(state, res);
        undo(c);                          // backtrack
    }
}
```

### P42. Subsets and Permutations
```java
List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> res = new ArrayList<>();
    subsetsFrom(0, nums, new ArrayList<>(), res);
    return res;
}
void subsetsFrom(int start, int[] nums, List<Integer> cur, List<List<Integer>> res) {
    res.add(new ArrayList<>(cur));                         // every node is a subset
    for (int i = start; i < nums.length; i++) {
        cur.add(nums[i]);
        subsetsFrom(i + 1, nums, cur, res);
        cur.remove(cur.size() - 1);
    }
}

List<List<Integer>> permute(int[] nums) {
    List<List<Integer>> res = new ArrayList<>();
    perm(nums, new boolean[nums.length], new ArrayList<>(), res);
    return res;
}
void perm(int[] nums, boolean[] used, List<Integer> cur, List<List<Integer>> res) {
    if (cur.size() == nums.length) { res.add(new ArrayList<>(cur)); return; }
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        used[i] = true; cur.add(nums[i]);
        perm(nums, used, cur, res);
        used[i] = false; cur.remove(cur.size() - 1);
    }
}
```
**Complexity:** subsets O(n·2ⁿ), permutations O(n·n!).

**With duplicates:** sort first, then skip with `if (i > start && nums[i] == nums[i-1]) continue;` (for permutations: `if (i > 0 && nums[i] == nums[i-1] && !used[i-1]) continue;`).

### P43. Combination Sum (reuse allowed)
```java
List<List<Integer>> combinationSum(int[] candidates, int target) {
    Arrays.sort(candidates);
    List<List<Integer>> res = new ArrayList<>();
    combo(candidates, target, 0, new ArrayList<>(), res);
    return res;
}
void combo(int[] c, int remain, int start, List<Integer> cur, List<List<Integer>> res) {
    if (remain == 0) { res.add(new ArrayList<>(cur)); return; }
    for (int i = start; i < c.length && c[i] <= remain; i++) {   // sorted → early stop
        cur.add(c[i]);
        combo(c, remain - c[i], i, cur, res);                     // i, not i+1: reuse allowed
        cur.remove(cur.size() - 1);
    }
}
```

### P44. Word Search (grid backtracking)
```java
boolean exist(char[][] board, String word) {
    for (int r = 0; r < board.length; r++)
        for (int c = 0; c < board[0].length; c++)
            if (search(board, word, 0, r, c)) return true;
    return false;
}
boolean search(char[][] b, String w, int i, int r, int c) {
    if (i == w.length()) return true;
    if (r < 0 || c < 0 || r >= b.length || c >= b[0].length || b[r][c] != w.charAt(i)) return false;
    char tmp = b[r][c]; b[r][c] = '#';                     // mark the cell as on the current path
    boolean found = search(b, w, i + 1, r + 1, c) || search(b, w, i + 1, r - 1, c)
                 || search(b, w, i + 1, r, c + 1) || search(b, w, i + 1, r, c - 1);
    b[r][c] = tmp;                                         // restore it
    return found;
}
```
**Also know:** N-Queens (use sets for columns and both diagonals: `r-c` and `r+c`), Sudoku solver, generate parentheses (`open < n`, `close < open`).


## Greedy

**Use when:** a locally optimal choice provably leads to the global optimum. **Be ready to justify it**, usually with an exchange argument ("swapping our choice for any other can't make things better"). If you can't justify it, the problem probably needs DP.

### P45. Jump Game I and II
```java
boolean canJump(int[] nums) {
    int reach = 0;
    for (int i = 0; i < nums.length; i++) {
        if (i > reach) return false;
        reach = Math.max(reach, i + nums[i]);
    }
    return true;
}

int minJumps(int[] nums) {                                 // BFS by levels, greedily
    int jumps = 0, curEnd = 0, farthest = 0;
    for (int i = 0; i < nums.length - 1; i++) {
        farthest = Math.max(farthest, i + nums[i]);
        if (i == curEnd) { jumps++; curEnd = farthest; }
    }
    return jumps;
}
```

### P46. Non-overlapping Intervals (interval scheduling)
**Greedy rule:** sort by **end time** and always keep the interval that finishes earliest. That leaves the most room for the rest.

```java
int eraseOverlapIntervals(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> Integer.compare(a[1], b[1]));
    int kept = 0, end = Integer.MIN_VALUE;
    for (int[] in : intervals) {
        if (in[0] >= end) { kept++; end = in[1]; }
    }
    return intervals.length - kept;
}
```
**Similar problems:** minimum arrows to burst balloons, the maximum number of deliveries one rider can do in non-overlapping slots.

### P47. Gas Station
**Idea:** if total gas ≥ total cost, a solution exists. Whenever the running tank goes negative, no station between the current start and here can be the start, so restart from the next station.

```java
int canCompleteCircuit(int[] gas, int[] cost) {
    int total = 0, tank = 0, start = 0;
    for (int i = 0; i < gas.length; i++) {
        int diff = gas[i] - cost[i];
        total += diff; tank += diff;
        if (tank < 0) { start = i + 1; tank = 0; }
    }
    return total >= 0 ? start : -1;
}
```

**Other greedy problems:** task scheduler (most frequent task first), partition labels, assign cookies, Huffman coding.
