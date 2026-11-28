---
id: 1-back-of-the-envelope
title: "Back-of-the-Envelope Estimation"
description: "The two numbers that decide the whole design, and how to get them in ninety seconds without a calculator"

sidebar_position: 1
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Before you draw anything, how big is this system? Estimate the queries per second, the storage after five years, and the bandwidth. Then tell me which of those numbers changes your design."

---

### Picture it

Somebody asks you to design a car park for a new office.

You could start drawing ramps. Or you could ask how many people work there. Two hundred people is a patch of tarmac. Twenty thousand is a multi-storey with its own traffic light, and no amount of clever ramp design turns the first into the second.

The estimate is not a side quest before the real work. **The estimate is what tells you which design you are being asked for.** A system taking fifty writes a second is one Postgres box and an afternoon. The same system at fifty thousand writes a second is a queue, a partitioned store and a team.

Interviewers ask for numbers because a candidate who skips them will confidently build the multi-storey for the two hundred people, or the tarmac for the twenty thousand, and will not know which mistake they made.

---

### The proper terms

#### Start from users, not from requests

You are almost always given a user count, or you can ask for one. Everything else is derived.

The chain is **daily active users**, then **actions per user per day**, then **seconds in a day**.

Seconds in a day is **86,400**. Round it to **100,000**. You will be out by 14%, which is nothing next to the error in "actions per user per day", and it turns every division into moving a decimal point.

So the first formula is:

**Average QPS = (DAU x actions per day) / 100,000**

Ten million daily users doing ten actions each is 100 million actions, over 100,000 seconds, which is **1,000 QPS**. You can do that in your head, out loud, and you should.

#### Peak is not average, and peak is what you build for

Nobody uses a product evenly across the day. Traffic clusters into waking hours and into a few spikes.

The working multiplier is **2x to 3x average for ordinary peak**, and far more for an event with a start time: a ticket sale, a flash sale, an exam result. Say which one you are assuming.

**Peak QPS = average QPS x 2 or 3**

A thousand average becomes **two to three thousand peak**. If the product has a scheduled moment, say so and multiply by ten or more, because that case is a different design: it wants admission control rather than a bigger database.

#### The read-to-write ratio is the most important number on the board

Ask for it early, and if nobody gives you one, state your assumption.

Most consumer products are **read heavy**, somewhere between **10:1 and 1000:1**. A social feed might be 100:1. A payments ledger might be 3:1. A logging pipeline is write heavy and inverts everything.

It matters because the two have completely different answers.

**Reads scale by copying.** Caches, read replicas, CDNs. All cheap, all well understood.

**Writes scale by splitting.** Sharding, partitioning, queues. All expensive, all where the hard problems live.

So a design with a thousand reads and ten writes a second is a caching conversation. A design with a thousand writes a second is a partitioning conversation. Saying which one you are in, out loud, is most of the value of the estimate.

#### Storage: one row, times the rows, times the years

**Storage per year = writes per day x bytes per write x days**

Three shortcuts make this doable in your head.

**Writes per day, not per second.** You already have actions per day from the first step, so do not convert to seconds and back.

**A year is roughly 400 days.** Another 10% overestimate, in the safe direction, and it makes the multiplication easy.

**Round the row.** A row of ids, a timestamp and a couple of numbers is about **100 bytes**. A row with a short text body is about **1 KB**. A photo is **1 MB**. A minute of video is **10 MB**. These are good enough.

So a million writes a day of 1 KB rows is **1 GB a day**, which is **400 GB a year**, which is **2 TB over five years**. That fits on one disk, which is the actual conclusion: you do not need to shard for volume, and if you shard it will be for throughput or blast radius instead.

#### Replication and indexes are a multiplier, not a rounding error

The number above is the raw data. What you provision is larger.

**Replication factor of 3** is the normal default, so multiply by three.

**Indexes** commonly add **30% to 100%** on top of the table.

So "2 TB of data" is really **6 TB of disk before indexes**, and perhaps 9 to 12 TB with them. Mentioning this unprompted is a strong signal, because it is the gap between a textbook estimate and a provisioning estimate.

#### Bandwidth is throughput in bits, not bytes

**Bandwidth = QPS x bytes per response x 8**

The multiplication by 8 is the one people drop: storage is sold in bytes, networks are sold in bits.

A thousand QPS of 10 KB responses is 10 MB a second, which is **80 Mbps**. Unremarkable. The same thousand QPS of 1 MB images is 1 GB a second, which is **8 Gbps**, and now you are talking about a CDN rather than a web server, because that is not a thing you serve from origin.

This is the number that most often reveals the design needs object storage and a CDN rather than a bigger application tier.

#### Numbers worth knowing by heart

These are the ones that settle arguments.

| Operation | Rough time |
| --- | --- |
| In-memory read | 100 nanoseconds |
| SSD random read | 100 microseconds |
| Round trip within a datacentre | 0.5 milliseconds |
| Redis round trip, same datacentre | 0.5 to 1 millisecond |
| Database query, indexed and warm | 1 to 10 milliseconds |
| Round trip across a continent | 30 to 50 milliseconds |
| Round trip between continents | 100 to 200 milliseconds |

And the capacities.

| Thing | Rough limit |
| --- | --- |
| One modern server, simple requests | a few thousand QPS |
| One Postgres box, mixed workload | low thousands of QPS |
| One Redis instance | around 100,000 ops per second |
| One Kafka partition | tens of MB per second |

The point of the latency table is that **distance is the one cost you cannot optimise away**. A cross-continent round trip is 100 ms because of the speed of light in fibre, not because of anything your code does. If a user in Sydney needs three sequential calls to a server in Virginia, that is 300 ms before you have executed a single line, and the only fix is to move the data closer.

---

### In code

Estimation is arithmetic, but writing it down as code is a good way to see which inputs actually move the answer.

```python
SECONDS_PER_DAY = 100_000       # 86,400, rounded for mental arithmetic
DAYS_PER_YEAR = 400             # 365, rounded the same way


def estimate(dau, actions_per_user, read_write_ratio,
             bytes_per_row, bytes_per_response,
             peak_multiplier=3, replicas=3, index_overhead=0.5, years=5):
    actions = dau * actions_per_user

    writes_per_second = actions / SECONDS_PER_DAY
    reads_per_second = writes_per_second * read_write_ratio

    raw_bytes = actions * bytes_per_row * DAYS_PER_YEAR * years
    provisioned = raw_bytes * replicas * (1 + index_overhead)

    peak_reads = reads_per_second * peak_multiplier
    read_bits_per_second = peak_reads * bytes_per_response * 8

    return {
        "writes/s avg": round(writes_per_second),
        "reads/s avg": round(reads_per_second),
        "writes/s peak": round(writes_per_second * peak_multiplier),
        "reads/s peak": round(peak_reads),
        "raw storage TB": round(raw_bytes / 1e12, 1),
        "provisioned TB": round(provisioned / 1e12, 1),
        "read Gbps peak": round(read_bits_per_second / 1e9, 2),
    }


# A feed-shaped product: 200M daily users, 2 posts each, read 100x more
print(estimate(dau=200_000_000, actions_per_user=2, read_write_ratio=100,
               bytes_per_row=300, bytes_per_response=2_000))
```

That prints roughly 4,000 writes a second on average, 12,000 at peak, 400,000 reads a second on average, 1.2 million at peak, 240 TB raw, around 1 PB provisioned, and about 19 Gbps of read bandwidth at peak.

Every one of those numbers points at a decision. Twelve thousand writes a second does not fit on one database, so the write path is partitioned. A million reads a second is never served from a database, so the read path is a cache with the database behind it. Nineteen gigabits is a CDN. A petabyte is object storage for the bodies and a much smaller store for the metadata.

**You did not design anything. The numbers did.** That is the point of doing them first.

---

### What they ask next

**"Why 100,000 and not 86,400? Does the rounding matter?"**
It does not, and saying why is the better answer. Your input error is the actions-per-user guess, which could easily be off by a factor of two. A 14% rounding sits well inside that, and the arithmetic being easy is worth more than a precision the inputs do not support. Round in the safe direction, and say which direction that is.

**"Your storage number ignores deletes and retention."**
Correct, and it is usually the first real reduction. Most systems do not keep everything forever: logs roll off after 30 days, soft-deleted rows are purged, cold data moves to object storage at a tenth of the price. Ask for the retention policy, because "five years of everything" and "90 days hot, the rest in object storage" are different budgets and sometimes different architectures.

**"What if the read-to-write ratio is wrong?"**
Then the design is wrong, which is exactly why it is worth stating as an assumption rather than assuming it silently. Being wrong out loud is recoverable, because the interviewer will correct you and you adjust. Being wrong silently means twenty minutes designing a cache tier for a write-heavy system.

**"Where does the 2x to 3x peak multiplier come from?"**
From traffic following waking hours rather than being flat. It is a rule of thumb, not a law, and the honest framing is that it covers ordinary daily variation only. Anything with a published start time breaks it completely: a ticket sale can do a day of traffic in ninety seconds, and that is not a bigger version of the same problem, it is a queue-and-admit problem.

**"How would you validate these numbers in production?"**
You would not validate them, you would replace them. Estimates exist to choose an architecture before there is data. Once there is traffic you have real percentiles, real row sizes and a real ratio, and the estimate's job is finished the day the first metric arrives.

**The common wrong answer** is producing precise-looking numbers with no stated assumptions. "About 14,327 QPS" invites the question "from what?", and if the answer is a chain of unstated guesses, the precision is false. **State every assumption as you use it**, round aggressively, and keep the arithmetic visible, because the interviewer is marking the reasoning rather than the digits.

---

### Say this in the interview

*"Before I draw anything I want two numbers: daily active users, and the read-to-write ratio, because those two decide which design this is.*

*Take ten million daily users doing ten actions each. That is a hundred million actions a day. I round a day to a hundred thousand seconds rather than 86,400, which is a 14% overestimate sitting well inside my error on actions per user, so that is a thousand actions a second on average. Peak is two to three times average for ordinary traffic, so call it three thousand. If there is a scheduled event like a ticket drop, that multiplier is ten or more, and the design changes to admission control rather than a bigger database.*

*The read-to-write ratio is the one that matters most. Reads scale by copying, with caches, replicas and CDNs, and all of that is cheap and well understood. Writes scale by splitting, with partitioning and queues, and that is where the hard problems are. So if this is a hundred-to-one read-heavy product, I am having a caching conversation, and if it is write heavy, I am having a partitioning conversation. I would rather state that assumption now than discover it twenty minutes in.*

*For storage I take writes per day, times row size, times roughly 400 days a year. A row of ids and timestamps is about a hundred bytes, a row with short text is about a kilobyte, a photo is a megabyte, a minute of video is about ten. Then I multiply by the replication factor, normally three, and add 30 to 100% for indexes, because the raw number is not what you provision.*

*Bandwidth is QPS times response size times eight, since storage is bytes and networks are bits. A thousand QPS of ten-kilobyte responses is 80 megabits, which is nothing. A thousand QPS of one-megabyte images is eight gigabits, which means object storage and a CDN rather than serving from origin.*

*The one number I keep in mind throughout is that a cross-continent round trip is 100 to 200 milliseconds and no amount of optimisation changes it, because it is the speed of light in fibre. If a user needs three sequential calls across an ocean, the latency budget is gone before any code runs, and the only fix is moving the data closer to them."*
