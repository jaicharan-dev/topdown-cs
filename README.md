<div align="center">

# TopDown CS

**Only what you need for the interview. Nothing else.**

[![Live site](https://img.shields.io/badge/topdowncs.com-6366f1?style=for-the-badge&logo=googlechrome&logoColor=white)](https://topdowncs.com)
[![332 questions](https://img.shields.io/badge/332_questions-10b981?style=for-the-badge)](https://topdowncs.com)
[![DSA + 4 core subjects](https://img.shields.io/badge/DSA_•_OS_•_DBMS_•_CN_•_OOP-f59e0b?style=for-the-badge)](https://topdowncs.com)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-8b5cf6?style=for-the-badge)](https://github.com/jaicharan-dev/topdown-cs/issues)

[Browse the site](https://topdowncs.com) &nbsp;·&nbsp;
[How a page is written](#how-a-page-is-written) &nbsp;·&nbsp;
[The question bank](#the-question-bank) &nbsp;·&nbsp;
[Run it locally](#run-it-locally) &nbsp;·&nbsp;
[Contributing](#contributing)

</div>

---

## What this is

A free, open collection of **332 interview questions** with worked explanations: 169 on data structures and algorithms, and 163 across operating systems, databases, networks, object-oriented programming and schema design.

Most interview material fails in one of two directions. It either drops you straight into code with no idea why the code looks like that, or it recites a textbook definition you cannot use when someone asks a follow-up. Both leave you able to recognise a solution without being able to rebuild it.

Every page here is written the other way round: the idea first, in plain words, then the reasoning that makes the idea obvious, and only then the code.

---

## How a page is written

Each DSA question follows the same six sections, in the same order, so you always know where to look.

| Section | What it does |
| :--- | :--- |
| **Picture it** | The idea in everyday terms, before any code or notation |
| **How to think about it** | Why the obvious approach falls short, and what the real insight is |
| **Walking through the example** | The actual input from the problem, step by step |
| **The code** | One solution, lightly commented. No brute-force section to scroll past |
| **Time and space complexity** | Worked out from the code in front of you, not stated as a fact to accept |
| **Remember this** | Three or four sentences you could say out loud in an interview |

Two rules shape all of it.

**One solution, not a catalogue.** Alternatives get a sentence where they genuinely matter, like quickselect next to a heap, or Kruskal next to Prim. They do not get their own code block to scroll past.

**Lead with the trap.** The part of a problem people actually get wrong is the part the page opens with. Sort Colors starts with the scanner you must not advance. Validate BST starts with the parent-only check that passes the example and is still wrong. Cheapest Flights starts with why Dijkstra breaks when you add a hop limit.

Pages on the four core subjects are shorter and less rigid, usually an analogy, then the mechanism underneath, then a **Say this in the interview** summary.

---

## The question bank

### Data structures and algorithms

169 questions across 18 blocks, ordered so that each one builds on the last. Arrays before two pointers, two pointers before sliding window, trees before graphs.

| # | Block | Questions | Difficulty | Start here |
| :-: | :--- | :-: | :--- | :-- |
| 1 | Arrays & Hashing | 12 | 3 easy · 8 med · 1 hard | [Two Sum](https://topdowncs.com/docs/dsa/arrays-hashing/1-two-sum) |
| 2 | Strings | 5 | 3 easy · 2 med | [Valid Anagram](https://topdowncs.com/docs/dsa/strings/1-valid-anagram) |
| 3 | Math Basics | 5 | 2 easy · 3 med | [Palindrome Number](https://topdowncs.com/docs/dsa/math-number-theory/1-palindrome-number) |
| 4 | Two Pointers | 9 | 4 easy · 4 med · 1 hard | [Valid Palindrome](https://topdowncs.com/docs/dsa/two-pointers/1-valid-palindrome) |
| 5 | Sliding Window | 8 | 6 med · 2 hard | [Longest Substring Without Repeating Characters](https://topdowncs.com/docs/dsa/sliding-window/1-longest-substring-without-repeating-characters) |
| 6 | Stacks & Queues | 10 | 1 easy · 7 med · 2 hard | [Valid Parentheses](https://topdowncs.com/docs/dsa/stacks/1-valid-parentheses) |
| 7 | Binary Search | 11 | 2 easy · 7 med · 2 hard | [Binary Search](https://topdowncs.com/docs/dsa/binary-search/1-binary-search) |
| 8 | Linked Lists | 13 | 6 easy · 5 med · 2 hard | [Reverse Linked List](https://topdowncs.com/docs/dsa/linked-lists/1-reverse-linked-list) |
| 9 | Trees & BST | 20 | 8 easy · 10 med · 2 hard | [Tree Traversals](https://topdowncs.com/docs/dsa/trees/1-tree-traversals-inorder-preorder-postorder) |
| 10 | Tries | 3 | 2 med · 1 hard | [Implement Trie](https://topdowncs.com/docs/dsa/tries/1-implement-trie-prefix-tree) |
| 11 | Heaps & Priority Queues | 7 | 6 med · 1 hard | [Top K Frequent Elements](https://topdowncs.com/docs/dsa/heaps-priority-queues/1-top-k-frequent-elements) |
| 12 | Backtracking | 10 | 9 med · 1 hard | [Subsets](https://topdowncs.com/docs/dsa/recursion-backtracking/1-subsets) |
| 13 | Intervals | 6 | 1 easy · 5 med | [Meeting Rooms](https://topdowncs.com/docs/dsa/intervals/1-meeting-rooms) |
| 14 | Greedy | 8 | 1 easy · 6 med · 1 hard | [Best Time to Buy and Sell Stock](https://topdowncs.com/docs/dsa/greedy/1-best-time-to-buy-and-sell-stock) |
| 15 | Graphs | 16 | 14 med · 2 hard | [Number of Islands](https://topdowncs.com/docs/dsa/graphs/1-number-of-islands) |
| 16 | 1D Dynamic Programming | 12 | 1 easy · 11 med | [Climbing Stairs](https://topdowncs.com/docs/dsa/16-1d-dp/1-climbing-stairs) |
| 17 | 2D Dynamic Programming | 8 | 6 med · 2 hard | [Unique Paths](https://topdowncs.com/docs/dsa/17-2d-dp/1-unique-paths) |
| 18 | Bit Manipulation | 6 | 5 easy · 1 med | [Single Number](https://topdowncs.com/docs/dsa/bit-manipulation/1-single-number) |

### Core computer science

163 questions. **Essentials** carry the ideas an interviewer expects you to have, **Additional** goes after the follow-up questions, and **Problems** are the numerical ones you work out on paper.

| Track | Module | Questions | Difficulty | Start here |
| :--- | :--- | :-: | :--- | :-- |
| **Operating Systems** | Essentials | 20 | 9 easy · 11 med | [Process vs Thread](https://topdowncs.com/docs/os-essential/1-process-vs-thread) |
| | Additional | 15 | 8 med · 7 hard | [Priority Inversion](https://topdowncs.com/docs/os-additional/1-priority-inversion-mars-rover) |
| | Problems | 8 | 7 med · 1 hard | [CPU Scheduling](https://topdowncs.com/docs/os-problems/1-cpu-scheduling-fcfs-sjf-srtf-round-robin) |
| **Databases** | Essentials | 15 | 7 easy · 8 med | [What is a Transaction](https://topdowncs.com/docs/dbms-essential/1-what-is-a-transaction) |
| | Additional | 20 | 1 easy · 16 med · 3 hard | [BCNF vs 3NF](https://topdowncs.com/docs/dbms-additional/9-bcnf-vs-3nf) |
| | Schema Design | 6 | 5 med · 1 hard | [Wallet & Payments](https://topdowncs.com/docs/database-design/1-wallet-payment-system) |
| **Networks** | Essentials | 10 | 5 easy · 4 med · 1 hard | [OSI vs TCP/IP](https://topdowncs.com/docs/cn-essential/1-osi-model-tcp-ip) |
| | Additional | 6 | 1 easy · 4 med · 1 hard | [Sessions vs JWT](https://topdowncs.com/docs/cn-additional/1-sessions-vs-jwt) |
| | Problems | 10 | 1 easy · 6 med · 3 hard | [Subnetting](https://topdowncs.com/docs/cn-problems/1-subnetting) |
| **OOP** | Essentials | 22 | 7 easy · 11 med · 4 hard | [Four Pillars of OOP](https://topdowncs.com/docs/oop-essential/1-four-pillars-of-oop) |
| | Additional | 17 | 3 easy · 11 med · 3 hard | [Static vs Dynamic Binding](https://topdowncs.com/docs/oop-additional/19-static-binding-vs-dynamic-binding) |
| | Code Tracing | 8 | 4 med · 4 hard | [Static, Instance, Constructor](https://topdowncs.com/docs/code-tracing/1-code-trace-static-instance-constructor) |
| | Design Patterns | 6 | 5 med · 1 hard | [Singleton](https://topdowncs.com/docs/design-patterns/1-singleton-pattern) |

**Suggested order:** Essentials across all four subjects first, since that is what most interviews actually cover. Then Additional for the follow-ups, and Problems if your round includes written calculations. DSA runs alongside, in block order.

---

## Run it locally

Built with [Docusaurus 3](https://docusaurus.io/), [React](https://react.dev/) and [KaTeX](https://katex.org/). Needs Node 20 or newer.

```bash
git clone https://github.com/jaicharan-dev/topdown-cs.git
cd topdown-cs/site
npm install
npm start
```

That serves the site at `http://localhost:3000` with hot reload.

To check a production build:

```bash
npm run build && npm run serve
```

### Layout

```
site/
├── docs/              every question, as Markdown
│   ├── dsa/           18 numbered blocks
│   ├── os-*/          operating systems
│   ├── dbms-*/        databases
│   ├── cn-*/          networks
│   ├── oop-*/         object-oriented programming
│   └── database-design/
├── src/
│   ├── components/    diagrams and the homepage DSA roadmap
│   ├── css/           theming
│   └── pages/         homepage
└── scripts/           generates the DSA counts shown on the homepage
```

Questions are plain Markdown with front matter. The sidebar is generated from the folder structure and the `sidebar_position` in each file, so adding a question is a matter of dropping a file in the right folder and numbering it.

---

## Contributing

Corrections are the most useful contribution, and small ones are welcome. If an explanation is wrong, unclear, or quietly skips the step that actually matters, that is worth an issue.

- **Found an error?** [Open an issue](https://github.com/jaicharan-dev/topdown-cs/issues) and quote the line.
- **Want a question added?** Open an issue describing where it came up. Questions that get asked often are worth more than obscure ones.
- **Sending a pull request?** Match the six-section shape above, keep the prose plain, and give one solution rather than a survey of them.

<div align="center">
<br/>

If this helped you prepare, a star costs nothing and helps other people find it.

</div>
