---
id: 11-accounts-merge
title: "721. Accounts Merge"
description: "Emails are the nodes, and sharing an account is the edge that joins them"
sidebar_position: 11
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Graphs</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Connected Components</span>

> **Problem Statement:** Each account has a name and some emails. Two accounts belong to the same person if they share any email, and different people may share a name. Merge them, returning each person's name followed by their emails in sorted order.

```text
Input:  accounts = [["John","johnsmith@mail.com","john_newyork@mail.com"],
                    ["John","johnsmith@mail.com","john00@mail.com"],
                    ["Mary","mary@mail.com"],
                    ["John","johnnybravo@mail.com"]]
Output: John with the three joined emails, Mary alone, and the other John alone
```

---

### Picture it

The first decision settles everything: **what is a node?**

Names are useless, since two different Johns may exist. Accounts are tempting but awkward. The right answer is that the **emails** are the nodes.

Then an account is a set of edges: every email it lists belongs to the same person, so join them all together. Once every account has been processed, each connected group of emails is one person.

```text
account 1 joins  johnsmith -- john_newyork
account 2 joins  johnsmith -- john00

so all three end up in one group, through the shared johnsmith
```

The merging that looks transitive, two accounts linked through a third, happens for free, because that is simply what connected groups are.

---

### How to think about it

Use disjoint set union over the emails.

**Pass one, build the groups.** For each account, take its first email as an anchor and join every other email to it. That is enough to put all of an account's emails in one group, and shared emails then pull separate accounts together. Record each email's name at the same time, so the name can be recovered later.

**Pass two, collect.** For each email, find its representative and add the email to that representative's bucket.

**Pass three, format.** For each bucket, sort the emails and put the owner's name in front.

The name needs care. It cannot be used for merging, but it must appear in the output, so keep a separate map from email to name. Every email in a group has the same name, since emails only merge through shared accounts, so reading the name from any one of them is safe, and the representative is the natural choice.

Sorting is required by the problem and is also why the output is stable, which is worth noting since the groups themselves come out in no particular order.

---

### Walking through the example

The emails are the nodes.

1. **Account 1** joins `johnsmith` and `john_newyork`.
2. **Account 2** joins `johnsmith` and `john00`. Since `johnsmith` is already with `john_newyork`, all three land in one group.
3. **Account 3** has a single email, `mary`, which stays on its own.
4. **Account 4** has `johnnybravo` alone, in its own group, even though the name is also John. The names never touched the merging, which is exactly what the problem wanted.

Three groups: the three joined Johns, Mary, and the lone John. Each gets its name in front and its emails sorted.

---

### The code

```python
class Solution:
    def accountsMerge(self, accounts: list[list[str]]) -> list[list[str]]:
        parent = {}
        owner = {}

        def find(x: str) -> str:
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        def union(a: str, b: str) -> None:
            ra, rb = find(a), find(b)
            if ra != rb:
                parent[rb] = ra

        # 1. emails are the nodes; an account joins all of its own
        for account in accounts:
            name, emails = account[0], account[1:]

            for email in emails:
                parent.setdefault(email, email)
                owner[email] = name          # the name is carried, not merged

            for email in emails[1:]:
                union(emails[0], email)

        # 2. collect each group under its representative
        groups = {}
        for email in parent:
            groups.setdefault(find(email), []).append(email)

        # 3. name first, then the emails sorted
        return [[owner[rep]] + sorted(emails) for rep, emails in groups.items()]
```

---

### Time and space complexity

#### Time: $O(N \log N)$

Where `N` is the total number of emails. The merging is effectively linear, and the sorting of each group dominates, since the group sizes add up to `N`.

#### Space: $O(N)$

The parent map, the owner map and the groups.

---

### Remember this

Choose the emails as the nodes, not the accounts and certainly not the names, and then an account is just a set of edges joining its own emails. Transitive merging across three accounts needs no special handling, because connected groups already mean that. Carry the name alongside for the output, read it from the representative, and sort each group as the problem requires. $O(N \log N)$ time.
