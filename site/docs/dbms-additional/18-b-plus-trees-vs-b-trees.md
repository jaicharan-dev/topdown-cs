---
id: 18-b-plus-trees-vs-b-trees
title: "B+ Trees vs B-Trees"
description: "Taking the data out of the internal nodes multiplies the fan-out tenfold, and linking the leaves turns a range scan into a walk"

sidebar_position: 18
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Why do relational database storage engines (like MySQL InnoDB and PostgreSQL) use B+ Trees instead of standard B-Trees? Prove mathematically why B+ Trees have higher fan-out, and explain how leaf node linked lists optimize range scans."

---

### Picture it

A building directory in a lobby, pointing you towards the right floor.

**One kind of directory has the full entry printed on the board**: name, department, phone number, photograph, extension list. Useful, and it means **very few people fit on the board**, because each one takes a lot of space. Twenty names per board, so you need boards on many landings before you reach anybody.

**The other kind prints only the ranges**: "A to F, go up; G to M, second floor; N to Z, third floor". Each line is a few characters, so **a thousand ranges fit on one board**. Two boards and you have narrowed a million people to one shelf.

That is the entire difference, and it is **arithmetic rather than cleverness**: the board holds a fixed amount of ink, so the less each line costs, the more lines fit, and the fewer boards you must visit.

**And then the second difference, which matters just as much.**

Suppose you want **everyone from G to K**, not one person. In the first building you find G, and then to reach the next name you **walk back down to the landing board, read it again, and walk up a different staircase**. Over and over, for every name in the range.

In the second building the shelves are **connected end to end**. You walk to the start of G **once**, and from then on you simply **keep walking forward**. You never look at a board again until you are done.

For a directory lookup of a single person the difference is small. For "give me everyone in this range", which is most of what anybody actually asks, it is the difference between a walk and a climbing exercise.

---

### The proper terms

#### The structural difference

**A B-tree stores keys and their associated data in every node**, internal nodes included. A search may therefore terminate at an internal node if the key is found there.

**A B+ tree stores keys only in internal nodes, and all data in the leaves.** Internal nodes are **pure routing information**, holding separator keys and child pointers and nothing else. Every search descends all the way to a leaf, and a key may appear twice: once as a separator above and once as a real entry in a leaf.

Two further properties of B+ trees follow from that:

**The leaves are chained** in a linked list, normally doubly linked.

**All data is at one level**, so every lookup costs the same.

#### The fan-out arithmetic

This is the "prove it mathematically" part, and it is a short calculation with real numbers.

**Fan-out** is the number of children per internal node, and it is determined by **how many entries fit in one page**:

```text
fanout = (page_size - header) / bytes_per_entry
```

Take InnoDB's 16 KB page, a `BIGINT` key of 8 bytes, a child pointer of 6 bytes, and a page header of roughly 120 bytes, leaving about 16,264 usable bytes.

**B+ tree internal entry** = key + child pointer = 8 + 6 = 14 bytes.

```text
fanout(B+) = 16264 / 14 ≈ 1161
```

**B-tree internal entry** = key + child pointer + the record itself. With a modest 128-byte row:

```text
entry = 8 + 6 + 128 = 142 bytes
fanout(B) = 16264 / 142 ≈ 114
```

So the fan-out ratio is:

```text
fanout(B+) / fanout(B) = (key + ptr + record) / (key + ptr)
                       = 142 / 14  ≈ 10.1x
```

**That ratio is the whole proof**: removing the record from the internal entry divides the entry size by roughly ten, and the fan-out is inversely proportional to entry size.

Now convert that into **height**, which is what you actually pay:

```text
height = log_fanout(N)
```

Since `log_f(N) = ln(N) / ln(f)`, the heights are in the ratio `ln(114) / ln(1161)`:

```text
ln(114)  = 4.74
ln(1161) = 7.06

height(B) / height(B+) = 7.06 / 4.74 ≈ 1.49
```

**A B-tree is about 50 percent taller for the same data**, and every extra level is a **potential random I/O**.

With concrete numbers for 1 billion rows of 128 bytes each:

**B+ tree.** A clustered leaf holds about `16264 / 128 ≈ 127` rows, so you need about **7.9 million leaves**. Above them: `7.9M / 1161 ≈ 6,800` nodes, then `6,800 / 1161 ≈ 6` nodes, then 1 root. That is 4 levels, so 4 page reads for a lookup.

**B-tree.** With fan-out 114, `log_114(10^9) = 20.72 / 4.74 ≈ 4.4`, so 5 levels at least, and more in practice because its internal nodes also store records, consuming the capacity that would otherwise route.

And the practical difference is larger than one page read suggests, because **the upper levels are permanently cached**. A B+ tree's root and second level are tiny, so a lookup is usually **one real I/O at the leaf**; a taller tree with larger internal nodes caches less effectively, so more of its levels actually touch disk.

#### Why the leaf linked list matters

Range scans are **most of what a database does**: `BETWEEN`, `>`, `<`, `ORDER BY ... LIMIT`, every pagination query, every date-range report.

**In a B+ tree**, a range scan is:

**Descend once** to the first qualifying leaf, costing `height` page reads.

**Follow the `next` pointers** along the leaf chain, reading leaves in order, until the range ends.

Total cost: `height + (number of leaves in the range)`. After the initial descent, **no internal node is visited again**, and the leaf reads are **sequential**, so the storage layer's **read-ahead** works and each read fetches data that will be wanted.

**In a B-tree**, a range scan is an **in-order traversal**. To move from one key to the next you may have to **ascend to a parent and descend into a different subtree**, repeatedly. Three consequences:

**Internal nodes are revisited constantly**, so the same pages are touched many times.

**The access pattern is scattered**, defeating read-ahead and sequential prefetching.

**The engine must maintain a stack** of the path, and each step can cost up to `height` node visits rather than a pointer dereference.

With double linking, B+ trees also support **backward scans**, which is how `ORDER BY ... DESC LIMIT n` is served without a sort.

#### The other advantages

Three more, each worth a sentence:

**Uniform, predictable path length.** Every search reaches a leaf, so every lookup costs exactly `height` reads. A B-tree can terminate early at an internal node, which is marginally faster in the best case and makes latency **variable**, which is worse for a system that must meet a percentile target.

**Simpler deletion.** In a B+ tree an internal key is only a **separator**, so deleting a record touches the leaf and the separators above may be left alone, even if they now name a key that no longer exists. In a B-tree, deleting a record held in an internal node requires finding a replacement from a subtree.

**Better key compression.** Because internal keys are only separators, they can be **prefix-truncated** to the shortest string that still distinguishes the children, which raises the fan-out further.

The cost side, for completeness: a key may be **stored twice**, as a separator and in a leaf, so a B+ tree uses marginally more space, and a lucky lookup is never faster. Both are irrelevant beside a 10x fan-out and sequential range scans, which is why **every mainstream relational engine uses B+ trees** while almost everyone calls them B-trees.

---

### In code

```text
The structural difference:

  B-TREE: keys AND DATA in every node

                  [ 50:row | 100:row ]
                 /         |          \
      [20:row 35:row]  [70:row]   [150:row 200:row]

      - internal nodes carry PAYLOAD -> fewer entries per page
      - a search may terminate EARLY at an internal node
      - a range scan must climb up and down (in-order traversal)

  B+ TREE: keys only above, ALL data in the leaves, leaves LINKED

                  [    50   |   100   ]        <- pure ROUTING
                 /          |          \
      [20|35] <-> [50|70|85] <-> [100|150|200]  <- all data, CHAINED

      - internal nodes carry NO payload -> many more entries per page
      - every search reaches a LEAF: uniform cost
      - a range scan DESCENDS ONCE then WALKS SIDEWAYS
```

```text
THE FAN-OUT PROOF, with real numbers.

  fanout = (page_size - header) / bytes_per_entry

  InnoDB page      16,384 bytes
  page header      ~120 bytes
  usable           ~16,264 bytes
  BIGINT key       8 bytes
  child pointer    6 bytes
  a modest row     128 bytes

  B+ TREE internal entry = key + pointer
                         = 8 + 6 = 14 bytes
     fanout(B+) = 16264 / 14  ~= 1161

  B-TREE internal entry  = key + pointer + THE RECORD
                         = 8 + 6 + 128 = 142 bytes
     fanout(B)  = 16264 / 142 ~= 114

  THE RATIO IS THE WHOLE PROOF:

     fanout(B+)   key + ptr + record     142
     ---------- = ------------------  =  ---  ~= 10.1x
     fanout(B)        key + ptr           14

  removing the record from the internal entry divides the entry size
  by ~10, and FAN-OUT IS INVERSELY PROPORTIONAL TO ENTRY SIZE.
```

```text
Converting fan-out into HEIGHT, which is what you actually pay:

  height = log_fanout(N) = ln(N) / ln(fanout)

  ln(114)  = 4.74
  ln(1161) = 7.06

  height(B)    ln(fanout B+)   7.06
  ---------- = ------------- = ----  ~= 1.49
  height(B+)   ln(fanout B)    4.74

  -> A B-TREE IS ~50% TALLER FOR THE SAME DATA, and every extra
     level is a POTENTIAL RANDOM I/O.

  concretely, 1 BILLION rows of 128 bytes:

  B+ TREE
     leaf holds 16264 / 128   ~= 127 rows
     leaves      1e9 / 127    ~= 7,900,000
     level above 7.9M / 1161  ~= 6,800
     level above 6800 / 1161  ~= 6
     root                        1
     -> 4 LEVELS = 4 page reads per lookup

  B-TREE
     log_114(1e9) = 20.72 / 4.74 ~= 4.4
     -> 5 LEVELS AT LEAST, and more in practice because its internal
        nodes also store records, consuming the capacity that would
        otherwise route

  and the real gap is wider than one page read, because THE UPPER
  LEVELS ARE PERMANENTLY CACHED: a B+ tree's root and second level
  are tiny, so a lookup is usually ONE REAL I/O at the leaf, while a
  taller tree with larger internal nodes caches less effectively.
```

```text
Why the leaf linked list matters: range scans are MOST of the work

  BETWEEN, >, <, ORDER BY ... LIMIT, every pagination query,
  every date-range report.

  B+ TREE range scan:
     1. DESCEND ONCE to the first qualifying leaf     (height reads)
     2. FOLLOW THE next POINTERS along the leaf chain

        root
          |
          v
        [20|35] -> [50|70|85] -> [100|150|200] -> ...
                      ^^^^^^^^^^^^^^^^^^^^^^^ just keep walking

     cost = height + (leaves in the range)
     AFTER THE DESCENT, NO INTERNAL NODE IS VISITED AGAIN, and the
     leaf reads are SEQUENTIAL, so read-ahead works and every
     fetched page is wanted.

  B-TREE range scan: an IN-ORDER TRAVERSAL
     to move from one key to the next you may have to ASCEND TO A
     PARENT AND DESCEND INTO A DIFFERENT SUBTREE, repeatedly:

        50 -> up to root -> down to 70 -> up -> down to 85 -> up ...

     1. internal nodes are REVISITED CONSTANTLY
     2. the access pattern is SCATTERED, defeating read-ahead
     3. the engine must maintain a STACK of the path, and each step
        can cost up to `height` node visits rather than one pointer
        dereference

  and with DOUBLE linking, B+ trees also serve BACKWARD scans, which
  is how ORDER BY ... DESC LIMIT n avoids a sort entirely.
```

```sql
-- What the leaf chain buys, in queries you run constantly
SELECT * FROM orders
WHERE  placed_at BETWEEN '2025-01-01' AND '2025-03-31';
--   descend to the first leaf, then WALK. Sequential page reads.

SELECT * FROM orders ORDER BY placed_at LIMIT 20;
--   read 20 entries from the leaf chain. THE SORT IS FREE.

SELECT * FROM orders ORDER BY placed_at DESC LIMIT 20;
--   walk the chain BACKWARDS. Also free, thanks to double linking.

SELECT * FROM orders WHERE id = 4471;
--   the one case where a B-tree could in principle be faster, by
--   terminating early at an internal node. It is also the case
--   where 4 page reads versus 5 barely matters.
```

```text
The other three advantages, and the honest costs:

  UNIFORM PATH LENGTH
     every search reaches a leaf, so every lookup costs exactly
     `height` reads. A B-tree can terminate EARLY at an internal
     node, which is marginally faster in the best case and makes
     latency VARIABLE, which is worse for a percentile target.

  SIMPLER DELETION
     a B+ tree internal key is only a SEPARATOR, so deleting a
     record touches the leaf and the separators above can be left
     alone even if they now name a key that no longer exists.
     In a B-tree, deleting a record held in an INTERNAL node
     requires finding a replacement from a subtree.

  BETTER KEY COMPRESSION
     separators can be PREFIX-TRUNCATED to the shortest string that
     still distinguishes the children, raising the fan-out further.

  THE COSTS
     a key may be stored TWICE, as a separator and in a leaf, so a
     B+ tree uses marginally more space
     a lucky lookup is never faster

  both are irrelevant beside a 10x fan-out and sequential range
  scans, which is why EVERY mainstream relational engine uses B+
  trees while almost everyone calls them B-trees.
```

---

### What they ask next

**"State the fan-out proof in one line."**
The internal entry size is `key + pointer` in a B+ tree and `key + pointer + record` in a B-tree, and fan-out is page size divided by entry size, so with a 128-byte row the ratio is `142/14`, roughly ten times.

**"How does that turn into height?"**
Height is `log_fanout(N)`, so the heights are in the ratio of the logarithms of the fan-outs: `ln(114)/ln(1161) ≈ 0.67`, meaning the B-tree is about 50 percent taller. Each extra level is a potential random I/O.

**"Why is the real difference bigger than the height difference?"**
Because the upper levels are permanently cached. A B+ tree's root and second level are small enough to stay resident, so a lookup is usually one real I/O at the leaf, while a taller tree with larger internal nodes caches a smaller proportion of itself.

**"What exactly does the leaf chain save?"**
Revisiting internal nodes. A B+ tree range scan descends once and then walks the leaves sequentially, so read-ahead works, while a B-tree must perform an in-order traversal, climbing back to parents repeatedly and producing a scattered access pattern.

**"Does a B-tree ever win?"**
Marginally, on a single lookup of a key that happens to live in an internal node, since it can terminate early. That is also the case where one fewer page read matters least, and it comes at the cost of variable latency.

**"Why are the leaves doubly linked?"**
So scans can run in both directions. `ORDER BY ... DESC LIMIT n` then walks the chain backwards from the end of the range rather than sorting, which is a large saving on a common pagination pattern.

**"What is prefix truncation?"**
Shortening a separator key to the minimum that still distinguishes its children, since an internal key need not be a real key. It increases entries per page, raising the fan-out and lowering the height further.

**"Why do people say B-tree when they mean B+ tree?"**
Historical shorthand. PostgreSQL's `USING btree` and InnoDB's documentation both describe B+ trees. Knowing the difference and knowing the terminology is loose is the right answer.

**The common wrong answer** is "B+ trees keep data in the leaves, which is better for range queries". True and half the story. The question asks for the **arithmetic**: the internal entry loses the record, so entry size falls roughly tenfold, fan-out rises by the same factor, and since height is `log_fanout(N)` the tree becomes about **50 percent shorter**, which is where the lookup win comes from. The leaf chain is the **separate** win, on scans.

---

### Say this in the interview

*"A B-tree stores keys and their data in every node, including internal ones, so a search can terminate early at an internal node. A B+ tree stores keys only in internal nodes, which become pure routing information holding separators and child pointers, with all data in the leaves, and the leaves are chained in a doubly linked list. Every search descends to a leaf, and a key can appear twice, as a separator above and as a real entry below.*

*The fan-out proof is a short calculation. Fan-out is the usable page size divided by the internal entry size. With InnoDB's 16-kilobyte page, about 16,264 usable bytes, an 8-byte BIGINT key and a 6-byte child pointer, a B+ tree internal entry is 14 bytes, giving a fan-out of about 1,161. A B-tree internal entry also carries the record, so with a modest 128-byte row it is 142 bytes, giving a fan-out of about 114. The ratio is 142 over 14, roughly ten times, and that ratio is the whole proof: removing the record divides the entry size by ten, and fan-out is inversely proportional to entry size.*

*Converting that into height, which is what you actually pay: height is log base fan-out of N, so the heights are in the ratio of the natural logs of the fan-outs, ln 114 over ln 1161, about 0.67, meaning a B-tree is roughly fifty percent taller for the same data, and every extra level is a potential random I/O. Concretely, for a billion 128-byte rows, a B+ tree leaf holds about 127 rows, giving 7.9 million leaves, then about 6,800 nodes above, then six, then a root: four levels, so four page reads. A B-tree at fan-out 114 needs log base 114 of a billion, about 4.4, so five levels at least, and more in practice because its internal nodes also store records and consume the capacity that would otherwise route. And the real gap is wider than one page read, because the upper levels are permanently cached, so a B+ tree lookup is usually one real I/O at the leaf.*

*The leaf linked list is a separate win, and it matters because range scans are most of what a database does: BETWEEN, greater than, ORDER BY with LIMIT, every pagination query, every date-range report. In a B+ tree a range scan descends once to the first qualifying leaf and then follows the next pointers along the chain, so the cost is the height plus the number of leaves in the range, no internal node is visited again after the descent, and the leaf reads are sequential so read-ahead works and every fetched page is wanted. In a B-tree the same scan is an in-order traversal, so moving from one key to the next may mean ascending to a parent and descending into a different subtree repeatedly, which revisits internal nodes constantly, scatters the access pattern and defeats prefetching, and needs a stack of the path with each step costing up to height node visits. With double linking, B+ trees also serve backward scans, which is how ORDER BY DESC LIMIT avoids a sort.*

*There are three further advantages. Uniform path length, since every search reaches a leaf, so every lookup costs the same, whereas a B-tree's early termination makes latency variable, which is worse for a percentile target. Simpler deletion, because an internal key is only a separator, so deleting a record touches the leaf and the separators can be left alone, while a B-tree deleting a record held in an internal node must find a replacement from a subtree. And better key compression, since separators can be prefix-truncated to the shortest string distinguishing the children, raising the fan-out further. The costs are that a key may be stored twice and a lucky lookup is never faster, both of which are irrelevant beside a tenfold fan-out and sequential range scans, which is why every mainstream engine uses B+ trees while everyone calls them B-trees."*
