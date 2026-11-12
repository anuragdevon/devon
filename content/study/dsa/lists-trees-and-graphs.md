---
title: "Linked lists, trees & graphs"
subtitle: "Draw the pointers before you move them."
description: "Dummy heads and fast/slow pointers, the one question behind every tree recursion, and BFS, DFS, topological sort and Dijkstra for graphs (P21–P33)."
date: 2026-11-12
track: dsa
weight: 4
---

Pointer problems reward drawing before coding. Trees reward one question: what does each recursive call return to its parent? Graphs reward choosing the right traversal: BFS for unweighted shortest paths, Dijkstra when edges have weights, topological sort when there are dependencies. Get those three habits and this whole family becomes routine.

> [!TIP] The short version
> - **Linked lists:** a dummy head removes edge cases; fast and slow pointers find middles and cycles.
> - **Trees:** decide what each call returns; update a global best when the answer spans both children.
> - **Graphs:** BFS for unweighted shortest path, Dijkstra for weights, Kahn's algorithm for ordering.
> - **Huge grids:** recursion can overflow the stack. Use an explicit stack or queue.

```java
class ListNode { int val; ListNode next; ListNode(int v) { val = v; } }
class TreeNode { int val; TreeNode left, right; TreeNode(int v) { val = v; } }
```


## Linked Lists

**Tricks:** a **dummy head node** removes special cases at the head. **Fast and slow pointers** find the middle and detect cycles. Draw the pointers before rewiring them.

### P21. Reverse a Linked List (iterative)
```java
ListNode reverse(ListNode head) {
    ListNode prev = null, cur = head;
    while (cur != null) {
        ListNode next = cur.next;
        cur.next = prev;
        prev = cur;
        cur = next;
    }
    return prev;
}
```
**Complexity:** O(n) time, O(1) space. **Used inside:** palindrome list, reverse in k-groups, reorder list.

### P22. Linked List Cycle II (find where the cycle starts)
**Idea (Floyd):** the slow pointer moves one step and the fast pointer two. If they meet, reset one pointer to the head and move both one step at a time. They meet again at the cycle's start.

```java
ListNode detectCycle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next; fast = fast.next.next;
        if (slow == fast) {
            ListNode p = head;
            while (p != slow) { p = p.next; slow = slow.next; }
            return p;
        }
    }
    return null;
}
```
**Why it works:** if the distance from the head to the cycle start is `a` and the meeting point is `b` into the cycle (cycle length `c`), then `2(a+b) = a+b+kc`, so `a = kc - b`. Walking `a` steps from both the head and the meeting point lands on the start.

### P23. Remove the Nth Node from the End
```java
ListNode removeNthFromEnd(ListNode head, int n) {
    ListNode dummy = new ListNode(0); dummy.next = head;
    ListNode fast = dummy, slow = dummy;
    for (int i = 0; i <= n; i++) fast = fast.next;         // gap of n+1
    while (fast != null) { fast = fast.next; slow = slow.next; }
    slow.next = slow.next.next;
    return dummy.next;
}
```


## Trees (DFS recursion)

**The key question for every tree problem: what should each recursive call return to its parent?** Sometimes it's a value (depth), sometimes a pair (is it balanced, and how tall), and sometimes you update a global best while returning something else (diameter, maximum path sum).

### P24. Maximum Depth, Diameter, and Balanced (one template)
```java
int maxDepth(TreeNode root) {
    return root == null ? 0 : 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}

// Diameter: return height, update the global best with left + right
int diameter = 0;
int height(TreeNode n) {
    if (n == null) return 0;
    int l = height(n.left), r = height(n.right);
    diameter = Math.max(diameter, l + r);
    return 1 + Math.max(l, r);
}

// Balanced: return -1 as an "unbalanced" sentinel
int checkHeight(TreeNode n) {
    if (n == null) return 0;
    int l = checkHeight(n.left);  if (l == -1) return -1;
    int r = checkHeight(n.right); if (r == -1) return -1;
    return Math.abs(l - r) > 1 ? -1 : 1 + Math.max(l, r);
}
```

### P25. Validate a Binary Search Tree
**The common mistake** is comparing a node only with its children. Every node must lie within the bounds set by **all** of its ancestors.

```java
boolean isValidBST(TreeNode root) { return valid(root, null, null); }
boolean valid(TreeNode n, Integer min, Integer max) {
    if (n == null) return true;
    if ((min != null && n.val <= min) || (max != null && n.val >= max)) return false;
    return valid(n.left, min, n.val) && valid(n.right, n.val, max);
}
```
**Alternative:** an in-order traversal of a BST must be strictly increasing.

### P26. Lowest Common Ancestor
```java
// General binary tree
TreeNode lca(TreeNode root, TreeNode p, TreeNode q) {
    if (root == null || root == p || root == q) return root;
    TreeNode l = lca(root.left, p, q), r = lca(root.right, p, q);
    if (l != null && r != null) return root;               // p and q are in different subtrees
    return l != null ? l : r;
}

// BST: use the ordering
TreeNode lcaBST(TreeNode root, TreeNode p, TreeNode q) {
    while (root != null) {
        if (p.val < root.val && q.val < root.val) root = root.left;
        else if (p.val > root.val && q.val > root.val) root = root.right;
        else return root;
    }
    return null;
}
```

### P27. Level-Order Traversal (BFS on a tree)
```java
List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> res = new ArrayList<>();
    if (root == null) return res;
    Deque<TreeNode> q = new ArrayDeque<>(List.of(root));
    while (!q.isEmpty()) {
        int size = q.size();                               // freeze the level size
        List<Integer> level = new ArrayList<>();
        for (int i = 0; i < size; i++) {
            TreeNode n = q.poll();
            level.add(n.val);
            if (n.left != null) q.offer(n.left);
            if (n.right != null) q.offer(n.right);
        }
        res.add(level);
    }
    return res;
}
```
**Variants:** right-side view (the last node of each level), zigzag order, the minimum depth (the first leaf found).

### P28. Binary Tree Maximum Path Sum
**Idea:** each node returns the best *downward* path to its parent (it can take only one branch). The global best can use **both** branches through the node. Ignore negative branches.

```java
int best = Integer.MIN_VALUE;
int maxPathSum(TreeNode root) { gain(root); return best; }
int gain(TreeNode n) {
    if (n == null) return 0;
    int l = Math.max(0, gain(n.left)), r = Math.max(0, gain(n.right));
    best = Math.max(best, n.val + l + r);
    return n.val + Math.max(l, r);
}
```


## Graphs: representation and traversal

**How to represent a graph:** an adjacency list `List<List<Integer>>`, or `Map<Node, List<Node>>`. Grids are implicit graphs: use 4-directional `dirs = {{1,0},{-1,0},{0,1},{0,-1}}`.

| Problem | Algorithm | Complexity |
|---------|-----------|------------|
| Connectivity, flood fill | DFS / BFS | O(V+E) |
| Shortest path, **unweighted** | BFS | O(V+E) |
| Shortest path, non-negative weights | Dijkstra | O((V+E) log V) |
| Shortest path, negative weights | Bellman-Ford | O(V·E) |
| Ordering by dependencies, cycle in a directed graph | Topological sort (Kahn's) | O(V+E) |
| Dynamic connectivity, grouping | Union-Find | ~O(α(n)) per operation |
| Minimum spanning tree | Kruskal (sort + Union-Find) / Prim | O(E log E) |

### P29. Number of Islands (grid DFS)
```java
int numIslands(char[][] grid) {
    int count = 0;
    for (int r = 0; r < grid.length; r++)
        for (int c = 0; c < grid[0].length; c++)
            if (grid[r][c] == '1') { count++; sink(grid, r, c); }
    return count;
}
void sink(char[][] g, int r, int c) {
    if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] != '1') return;
    g[r][c] = '0';                                         // mark visited
    sink(g, r + 1, c); sink(g, r - 1, c); sink(g, r, c + 1); sink(g, r, c - 1);
}
```
**Follow-up:** with a very large grid, recursion can overflow the stack. Use an iterative BFS or DFS with an explicit stack.

### P30. Rotting Oranges (multi-source BFS)
**Idea:** start the BFS from **all** rotten oranges at once. Each BFS level is one minute.

```java
int orangesRotting(int[][] grid) {
    int rows = grid.length, cols = grid[0].length, fresh = 0, minutes = 0;
    Deque<int[]> q = new ArrayDeque<>();
    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == 2) q.offer(new int[]{r, c});
            else if (grid[r][c] == 1) fresh++;
        }
    int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};
    while (!q.isEmpty() && fresh > 0) {
        for (int i = q.size(); i > 0; i--) {
            int[] cur = q.poll();
            for (int[] d : dirs) {
                int nr = cur[0] + d[0], nc = cur[1] + d[1];
                if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] != 1) continue;
                grid[nr][nc] = 2; fresh--; q.offer(new int[]{nr, nc});
            }
        }
        minutes++;
    }
    return fresh == 0 ? minutes : -1;
}
```
**Similar problems:** walls and gates, 01-matrix, "distance from each house to the nearest warehouse".

## Graphs: ordering, weights and cycles

### P31. Course Schedule (topological sort, Kahn's algorithm)
```java
int[] findOrder(int n, int[][] prereqs) {
    List<List<Integer>> adj = new ArrayList<>();
    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
    int[] indegree = new int[n];
    for (int[] p : prereqs) { adj.get(p[1]).add(p[0]); indegree[p[0]]++; }

    Deque<Integer> q = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (indegree[i] == 0) q.offer(i);
    int[] order = new int[n]; int idx = 0;
    while (!q.isEmpty()) {
        int u = q.poll(); order[idx++] = u;
        for (int v : adj.get(u)) if (--indegree[v] == 0) q.offer(v);
    }
    return idx == n ? order : new int[0];                 // idx < n means there's a cycle
}
```
**Real-world uses:** build systems, task schedulers, DAG workflow engines (Airflow), and the order of database migrations.

### P32. Network Delay Time (Dijkstra)
```java
int networkDelayTime(int[][] times, int n, int k) {
    Map<Integer, List<int[]>> adj = new HashMap<>();
    for (int[] t : times) adj.computeIfAbsent(t[0], x -> new ArrayList<>()).add(new int[]{t[1], t[2]});
    int[] dist = new int[n + 1];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[k] = 0;
    PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[1])); // {node, dist}
    pq.offer(new int[]{k, 0});
    while (!pq.isEmpty()) {
        int[] cur = pq.poll();
        int u = cur[0], d = cur[1];
        if (d > dist[u]) continue;                         // stale entry
        for (int[] e : adj.getOrDefault(u, List.of())) {
            int v = e[0], nd = d + e[1];
            if (nd < dist[v]) { dist[v] = nd; pq.offer(new int[]{v, nd}); }
        }
    }
    int max = 0;
    for (int i = 1; i <= n; i++) {
        if (dist[i] == Integer.MAX_VALUE) return -1;
        max = Math.max(max, dist[i]);
    }
    return max;
}
```
**Follow-ups:** the shortest path with at most K stops (Bellman-Ford limited to K rounds, or BFS over states). A* adds a heuristic and is used in real map routing. Real delivery ETAs use precomputed road graphs (contraction hierarchies) and learned travel times.

### P33. Clone Graph / Detect a Cycle (DFS with states)
```java
// Cycle in a directed graph: 0 = unvisited, 1 = visiting (on the current path), 2 = done
boolean hasCycle(List<List<Integer>> adj) {
    int[] state = new int[adj.size()];
    for (int i = 0; i < adj.size(); i++) if (state[i] == 0 && dfs(i, adj, state)) return true;
    return false;
}
boolean dfs(int u, List<List<Integer>> adj, int[] state) {
    state[u] = 1;
    for (int v : adj.get(u)) {
        if (state[v] == 1) return true;                    // back edge
        if (state[v] == 0 && dfs(v, adj, state)) return true;
    }
    state[u] = 2;
    return false;
}
```
**For an undirected graph:** track the parent (and don't count the edge back to it), or use Union-Find (P49).
