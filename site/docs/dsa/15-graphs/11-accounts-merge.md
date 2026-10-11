---
id: 11-accounts-merge
title: "721. Accounts Merge"
description: "Merge overlapping user email accounts using graph DFS or Disjoint Set Union"
sidebar_position: 11
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Connected Components</span>

> **Problem Statement:** Given a list of `accounts` where each element `accounts[i]` is a list of strings: the first element `accounts[i][0]` is a person's name, and the remaining elements are emails belonging to that account. Two accounts belong to the same person if there is at least one common email between them. Note that multiple people can share the same name. Return the accounts after merging. The output for each merged account should have the owner's name followed by the emails sorted in lexicographical order.

```text
Input:  accounts = [["John","johnsmith@mail.com","john_newyork@mail.com"],["John","johnsmith@mail.com","john00@mail.com"],["Mary","mary@mail.com"],["John","johnnybravo@mail.com"]]
Output: [["John","john00@mail.com","john_newyork@mail.com","johnsmith@mail.com"],["Mary","mary@mail.com"],["John","johnnybravo@mail.com"]]
Explanation: The first two John accounts share "johnsmith@mail.com", merging them into one account. The other two accounts have distinct emails and remain separate.
```

---

### The Intuitive Mental Model

At first glance, this problem appears to be about string manipulation or hash table merging. In reality, it is a graph problem about **connected components**:
- **Names can be identical for different users:** Two separate individuals can share the name "John". Therefore, names cannot serve as graph nodes or unique identifiers.
- **Emails are globally unique:** An email address belongs to exactly one individual. Therefore, **emails are the true graph vertices**.
- An account `["John", "e1", "e2", "e3"]` declares that `e1`, `e2`, and `e3` belong to the same person. Connecting `e1` to `e2` and `e1` to `e3` links all emails of an individual into a single connected component.

#### Brute Force: Iterative Set Merging
The naive approach is to convert every account's emails into a set and perform pairwise comparisons. If two sets share any email, merge them into one larger set and restart or continue scanning. In the worst case where merges occur sequentially across $N$ accounts, this requires $O(N^2 \cdot M)$ set intersection and union operations, repeatedly copying strings.

#### Optimal Approach: Connected Components on an Email Graph
Instead of pairwise set comparisons, we model the problem as an undirected graph:
1. **Build the Email Graph:** For each account, connect the first email bidirectionally with every other email in that account, and record the owner name in an `email_to_name` dictionary.
2. **Extract Connected Components:** Traverse every unique email. When an unvisited email is found, launch a DFS or BFS traversal to collect all emails transitively connected to it.
3. **Format Result:** Sort the collected emails for each component alphabetically and prepend the person's name.

#### Execution Walkthrough

Let us trace `accounts = [["John", "a", "b"], ["John", "b", "c"], ["Mary", "d"]]`:

| Step | Account Processed | Edges Added | Visited Component Gathered | Sorted Merged Result |
| :---: | :---: | :---: | :---: | :--- |
| **Graph Construction** | `["John", "a", "b"]`, `["John", "b", "c"]`, `["Mary", "d"]` | `a <-> b`, `b <-> c` | - | Adjacency list built; `email_to_name` mapped |
| **Component 1 (DFS)** | Start at `a` | - | Traverses `a -> b -> c` (`{a, b, c}`) | `["John", "a", "b", "c"]` |
| **Component 2 (DFS)** | Start at `d` | - | Traverses `d` (`{d}`) | `["Mary", "d"]` |

---

### Step-by-Step Algorithm

1. **Build Adjacency Graph and Map Names:**
   - Initialize `adj: dict[str, list[str]] = defaultdict(list)` and `email_to_name: dict[str, str] = {}`.
   - For each account, let `name = account[0]` and `first_email = account[1]`.
   - For each `email` in `account[1:]`, add bidirectional edges between `first_email` and `email`, and record `email_to_name[email] = name`.
2. **Traverse Connected Components:**
   - Initialize `visited: set[str] = set()` and `merged_accounts: list[list[str]] = []`.
   - Iterate over each `email` in `email_to_name`. If the email has not been visited, start a new component.
3. **Run Iterative DFS:**
   - Push `email` to a DFS stack and add it to `visited`.
   - While stack is non-empty, pop `curr`, append to `component`, and push all unvisited neighbors to the stack while adding them to `visited`.
4. **Sort and Prepend:**
   - Sort the collected component lexicographically.
   - Prepend `email_to_name[email]` and append the resulting list to `merged_accounts`.
5. **Return Result:** Return `merged_accounts`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Graph Adjacency List (DFS)" default>

```python
from collections import defaultdict

class Solution:
    def accountsMerge(self, accounts: list[list[str]]) -> list[list[str]]:
        adj: dict[str, list[str]] = defaultdict(list)
        email_to_name: dict[str, str] = {}

        # 1. Build the undirected email graph and map emails to owners
        for account in accounts:
            name = account[0]
            first_email = account[1]

            for email in account[1:]:
                adj[first_email].append(email)
                adj[email].append(first_email)
                email_to_name[email] = name

        visited: set[str] = set()
        merged_accounts: list[list[str]] = []

        # 2. Extract each connected component via DFS
        for email, name in email_to_name.items():
            if email not in visited:
                visited.add(email)
                component: list[str] = []
                stack = [email]

                while stack:
                    curr = stack.pop()
                    component.append(curr)

                    for neighbor in adj[curr]:
                        if neighbor not in visited:
                            visited.add(neighbor)
                            stack.append(neighbor)

                # 3. Sort emails lexicographically and prepend name
                merged_accounts.append([name] + sorted(component))

        return merged_accounts
```

  </TabItem>
  <TabItem value="dsu" label="Alternative: Disjoint Set Union (DSU)">

```python
from collections import defaultdict

class UnionFind:
    def __init__(self) -> None:
        self.parent: dict[str, str] = {}
        self.rank: dict[str, int] = {}

    def find(self, x: str) -> str:
        if self.parent.setdefault(x, x) != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x: str, y: str) -> None:
        root_x = self.find(x)
        root_y = self.find(y)
        if root_x == root_y:
            return

        rank_x = self.rank.setdefault(root_x, 0)
        rank_y = self.rank.setdefault(root_y, 0)
        if rank_x > rank_y:
            self.parent[root_y] = root_x
        elif rank_x < rank_y:
            self.parent[root_x] = root_y
        else:
            self.parent[root_y] = root_x
            self.rank[root_x] = rank_x + 1

class Solution:
    def accountsMerge(self, accounts: list[list[str]]) -> list[list[str]]:
        uf = UnionFind()
        email_to_name: dict[str, str] = {}

        # Union emails within each account
        for account in accounts:
            name = account[0]
            first_email = account[1]
            for email in account[1:]:
                uf.union(first_email, email)
                email_to_name[email] = name

        # Group emails by their root representative
        groups: dict[str, list[str]] = defaultdict(list)
        for email in email_to_name:
            root = uf.find(email)
            groups[root].append(email)

        # Build formatted merged accounts
        return [[email_to_name[root]] + sorted(emails) for root, emails in groups.items()]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Adjacency Graph (DFS)** | $O(N \cdot M \log(N \cdot M))$ | $O(N \cdot M)$ | Constructs bidirectional edges between emails and traverses components linearly. Component sorting dominates runtime. |
| **Disjoint Set Union (DSU)** | $O(N \cdot M \log(N \cdot M))$ | $O(N \cdot M)$ | Merges email sets on the fly without storing explicit neighbor adjacency lists; groups components by common representative roots. |

---

### Common Pitfall: Keying by Account Name Instead of Email

Because different individuals can share the exact same name (e.g. two unrelated people named "John"), using the owner's name as a graph node or dictionary key incorrectly combines distinct accounts. Only email addresses are unique, so all graph edges and disjoint sets must be keyed strictly on email strings.

---

### Concise Interview Takeaway

Treat unique email addresses as vertices and connect emails belonging to the same account with undirected edges. Extracting connected components using DFS or Disjoint Set Union groups each user's emails together, allowing straightforward sorting and formatting in $O(N \cdot M \log(N \cdot M))$ time.
