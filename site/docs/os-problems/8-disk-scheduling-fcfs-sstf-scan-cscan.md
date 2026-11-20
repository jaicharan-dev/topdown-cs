---
id: 8-disk-scheduling-fcfs-sstf-scan-cscan
title: "Disk Scheduling: FCFS, SSTF, SCAN and C-SCAN"
description: "640 tracks of head movement cut to 236, the two that waste a trip to the edge for a reason, and why none of this applies to the disk in your laptop"

sidebar_position: 8
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "A disk has 200 tracks (0 to 199) with the read/write head currently at track 53. For the request queue `(98, 183, 37, 122, 14, 124, 65, 67)`, calculate the total head movement in tracks for FCFS, SSTF, SCAN, and C-SCAN (assuming upward initial movement). How do LOOK and C-LOOK improve upon these elevator algorithms?"

---

### Picture it

A single arm on a pivot, and a stack of floors it has to visit.

The thing that makes this problem a problem is that **the arm is the only moving part and moving it is the only cost.** Reading a track once you are on it is nearly free; getting there is millions of times more expensive than the decision about where to go next. So the scheduler can afford to think as hard as it likes, and the only number on the scoreboard is total distance travelled.

**Serve requests in the order they arrived** and the arm does something almost comic. It goes to floor 98, then up to 183, then all the way down to 37, then back up to 122, then down to 14, then up to 124. It crosses the same ground over and over, not because the requests are awkward but because arrival order carries no information about position. On these eight requests that costs 640 tracks of travel to visit a range only 169 tracks wide, which is the clearest possible statement of the waste: **the arm travels nearly four times the width of the region it is working in.**

**Always go to the nearest request** and the obvious greedy fix drops it to 236. That is the best figure on the page, and it is also the one you should not ship, for a reason that the eight requests here cannot show you. The arm goes where the requests are dense, and if new requests keep arriving near wherever it happens to be, a request out at track 183 is never the nearest one. **It is not slow, it is never chosen**, and nothing about having waited makes it any more attractive.

So the fix that real systems use is not cleverness, it is **committing to a direction.** Sweep steadily upward serving everything you pass, then turn round and sweep steadily down. This is a lift, and the reason it is the right answer is the same reason lifts work: you give up on being optimal for the person pressing the button right now, in exchange for a hard promise that nobody waits longer than two sweeps. The arm passes every track on a known cycle, so a request at 183 is served because **the arm is coming, not because it was asked nicely.**

Then there are two refinements worth understanding separately, because they are often confused.

**One asks why you drive to the top floor when nobody is up there.** The sweep as classically defined runs to track 199 and turns round; nobody requested 199, so those 32 tracks are pure waste. Stopping at the last actual request is strictly better and costs nothing.

**The other asks why you turn round at all.** Turning round means the tracks you just covered get served again immediately while the far end waits a full double sweep, so the wait depends on where you are. Returning to the start instead and always sweeping the same way makes every track's wait the same, which costs travel and buys uniformity.

And then the modern footnote, which is the most useful thing on the page: **the arm does not exist any more.** All of this is mechanics, and an SSD has no mechanics. The arithmetic below is worth doing because it teaches how to trade throughput against fairness, and not because your laptop runs it.

---

### The proper terms

#### What is actually being minimised

A disk access costs three things. **Seek time** is moving the arm to the right track, and on a spinning disk it dominates everything, running from under a millisecond for a neighbouring track to over ten for a full sweep. **Rotational latency** is waiting for the sector to come round under the head, averaging half a revolution, so about 4 ms at 7,200 rpm. Transfer time is the actual reading, which is microseconds.

Every algorithm here minimises **total head movement** measured in tracks, which is a proxy for total seek time. It is a reasonable proxy and not an exact one, because real seek time is not linear in distance: there is a fixed settling cost per seek, so two seeks of 10 tracks cost more than one seek of 20. That is one reason SSTF's advantage on paper overstates its advantage in practice.

The service order is the sequence in which requests are satisfied, and the **sweep** or **scan** is one pass of the arm in a single direction.

#### The algorithms

**FCFS**, first come first served, serves in arrival order. It is the only one of the six that is perfectly fair in the strict sense that no request can ever be overtaken, and it is the worst by a wide margin, because arrival order is uncorrelated with position.

**SSTF**, shortest seek time first, always serves the closest pending request. It is greedy, it usually produces the lowest total movement, and it can **starve** a request at the edge of the disk indefinitely, because a steady arrival of nearby requests means a distant one is never the nearest.

**SCAN**, the **elevator algorithm**, moves in one direction serving everything it passes, continues to the last track of the disk, then reverses and does the same downward. The guarantee is a bound: no request waits longer than two sweeps.

**C-SCAN**, circular SCAN, sweeps in one direction only. On reaching the last track it returns to track 0 without serving anything on the way back and begins the next upward sweep. The return is a single large seek rather than a service pass.

**LOOK** is SCAN with one change: it reverses at the last pending request rather than at the physical end of the disk. It serves exactly the same order as SCAN and travels strictly less, so **SCAN has no advantage over LOOK whatsoever.**

**C-LOOK** is C-SCAN with the same change: it goes up to the highest pending request, then jumps straight to the lowest pending request rather than to track 0.

#### The property the two circular variants buy

Under SCAN and LOOK the arm reverses, so the tracks it has just covered are served again almost immediately while the far end waits a full double sweep. Waiting time therefore depends on position, and a track in the middle is served roughly twice as often as one at the edge.

Under C-SCAN and C-LOOK the arm always travels the same way, so every track is visited exactly once per cycle and the maximum wait is **one sweep** regardless of position. That is **variance**, not mean: the circular variants travel further in total and in exchange make the waiting time uniform. It is the right trade when requests are spread evenly or when a predictable upper bound matters more than an average.

#### Why this is largely historical

A solid state drive has no arm, so **seek time is essentially zero** and track distance is meaningless; the logical block addresses the kernel sees are mapped by the drive's own flash translation layer to physical locations the kernel cannot know. Reordering by LBA therefore optimises a quantity that does not exist. What matters instead is queue depth, keeping enough requests in flight to use the device's internal parallelism, and avoiding write amplification.

Linux reflects this directly. The `none` scheduler, formerly called `noop`, does no reordering at all and is the usual choice for NVMe. **mq-deadline** is a deadline-based scheduler that keeps the sorted queue idea but attaches an expiry to each request so nothing starves. **BFQ** allocates I/O bandwidth proportionally between processes, which is fairness between applications rather than between tracks. **Kyber** throttles to hold latency targets. None of them is an elevator, and the elevator's descendants survive only as the sorted queue inside mq-deadline, which still helps on actual spinning disks.

---

### Work it out

#### The setup

| Quantity | Value |
| :--- | :--- |
| Tracks | 0 to 199 |
| Head position | 53 |
| Initial direction | upward, toward higher track numbers |
| Request queue, in arrival order | 98, 183, 37, 122, 14, 124, 65, 67 |

Sort the queue around the head, because every algorithm except FCFS works from this:

- **Above or at 53:** 65, 67, 98, 122, 124, 183
- **Below 53:** 37, 14

The requests span tracks 14 to 183, a range **169 tracks wide**. That is the figure to hold onto: it is roughly the least any algorithm could travel, and it is what the 640 below should be compared against.

#### Part 1: FCFS

Serve in arrival order, with no reordering at all.

`53 -> 98 -> 183 -> 37 -> 122 -> 14 -> 124 -> 65 -> 67`

| From | To | Distance |
| :---: | :---: | :---: |
| 53 | 98 | 45 |
| 98 | 183 | 85 |
| 183 | 37 | **146** |
| 37 | 122 | 85 |
| 122 | 14 | **108** |
| 14 | 124 | **110** |
| 124 | 65 | 59 |
| 65 | 67 | 2 |
| | **Total** | **640 tracks** |

```
  0        14   37   53   65 67      98      122 124           183      199
  |--------*----*----H----*--*-------*-------*---*-------------*--------|

  arrival order drags the arm back and forth:
  53 -->-->-->-->-- 98
                    98 -->-->-->-- 183
   37 --<--<--<--<--<--<--<--<--<-- 183
   37 -->-->-->-->-->-- 122
   14 --<--<--<--<--<--<-- 122
   14 -->-->-->-->-->-->-- 124
                 65 --<--<-- 124
                 65 -->- 67
```

**640 tracks to cover a 169-track range**, which is 3.8 times the width of the working region. Three single moves account for 364 of those tracks, and all three are reversals: 183 down to 37, 122 down to 14, and 14 back up to 124. FCFS does not do anything stupid at any individual step; it simply has no information, because **arrival order says nothing about position.**

The one thing it does have is strict fairness: no request is ever overtaken, so the ordering is completely predictable. That is worth a sentence, since it is the only argument in its favour.

#### Part 2: SSTF

At every step, go to the nearest pending request.

| At | Pending | Nearest | Distance |
| :---: | :--- | :---: | :---: |
| 53 | 14, 37, 65, 67, 98, 122, 124, 183 | **65** | 12 |
| 65 | 14, 37, 67, 98, 122, 124, 183 | **67** | 2 |
| 67 | 14, 37, 98, 122, 124, 183 | **37** | 30 |
| 37 | 14, 98, 122, 124, 183 | **14** | 23 |
| 14 | 98, 122, 124, 183 | **98** | **84** |
| 98 | 122, 124, 183 | **122** | 24 |
| 122 | 124, 183 | **124** | 2 |
| 124 | 183 | **183** | 59 |
| | | **Total** | **236 tracks** |

`53 -> 65 -> 67 -> 37 -> 14 -> 98 -> 122 -> 124 -> 183`

**236 tracks, a 2.71-fold improvement on FCFS.** The best total on this page.

Two things to say about it rather than just reporting the number.

**The 84-track jump at step 5 is the greedy algorithm's bill.** Having gone down to clear 37 and 14, the arm is stranded at the bottom with everything else above it, so it pays one long haul back. A directional sweep never incurs that, which is why SSTF's win here is smaller than greedy intuition suggests.

**The starvation is structural and this queue cannot show it.** With a fixed queue of eight, SSTF terminates and serves everything. Now suppose new requests keep arriving in the 60 to 70 band while the arm is down there. Track 183's distance never becomes the smallest, so **it is never selected, no matter how long it has waited**, because elapsed waiting time is not an input to the decision. This is the same shape as starvation under priority scheduling: the request is perfectly serviceable and simply never chosen, and the fix has to be a mechanism that converts waiting into priority, which is exactly what `mq-deadline` does with per-request expiry times.

#### Part 3: SCAN, the elevator

Move upward serving everything passed, continue to track 199, reverse, serve downward.

`53 -> 65 -> 67 -> 98 -> 122 -> 124 -> 183 -> 199 -> 37 -> 14`

| Segment | Moves | Distance |
| :--- | :--- | :---: |
| Upward sweep, serving | 53 to 65 to 67 to 98 to 122 to 124 to 183 | 130 |
| Continue to the end, serving nothing | 183 to 199 | **16** |
| Reverse, downward sweep | 199 to 37 to 14 | 185 |
| | **Total** | **331 tracks** |

```
  0        14   37   53   65 67      98      122 124           183      199
  |--------*----*----H----*--*-------*-------*---*-------------*--------|
                     |--------------- sweep up ----------------|---->|
                                                        (16 wasted) --^
  |<------------------------- sweep down --------------------------|
```

**331 tracks**, 1.93 times better than FCFS and worse than SSTF, which is the expected ordering.

The 16 tracks from 183 to 199 are **pure waste**: nothing was requested up there and nothing is served on the way. That is what LOOK removes.

What SCAN buys for the extra travel is the bound. Because the arm covers the whole disk on a known cycle, **no request waits more than two sweeps**, and that holds no matter what arrives or when. Nothing can be starved, because the arm is coming regardless.

#### Part 4: C-SCAN, circular

Sweep upward only. On reaching 199, return immediately to 0 without serving anything, then sweep up again.

`53 -> 65 -> 67 -> 98 -> 122 -> 124 -> 183 -> 199 -> 0 -> 14 -> 37`

| Segment | Moves | Distance |
| :--- | :--- | :---: |
| Upward sweep, serving | 53 to 183 | 130 |
| Continue to the end | 183 to 199 | 16 |
| **Return seek, serving nothing** | 199 to 0 | **199** |
| Next upward sweep, serving | 0 to 14 to 37 | 37 |
| | **Total** | **382 tracks** |

**382 tracks**, the worst of the reordering algorithms and 1.68 times better than FCFS.

That 199-track return is the whole cost, and it buys exactly one thing: **uniformity.** Under SCAN the arm reverses, so after serving 183 it comes back down through 124 and 122 straight away, while under C-SCAN those tracks wait for the next full sweep. The consequence is that under SCAN the middle of the disk is visited about twice as often as the edges and **waiting time depends on where your track is**, while under C-SCAN every track is visited once per cycle and the maximum wait is one sweep regardless of position.

So the comparison to make is not that C-SCAN is worse. It is that **C-SCAN trades mean for variance**, and whether that is a good trade depends on whether you are optimising throughput or a latency guarantee.

#### Part 5: LOOK and C-LOOK

Both change one rule: **stop at the last request rather than at the end of the disk.**

**LOOK.** Up to 183, the highest pending request, then reverse.

`53 -> 65 -> 67 -> 98 -> 122 -> 124 -> 183 -> 37 -> 14`

| Segment | Distance |
| :--- | :---: |
| Up, 53 to 183 | 130 |
| Down, 183 to 37 to 14 | 169 |
| **Total** | **299 tracks** |

**C-LOOK.** Up to 183, then jump directly to 14, the lowest pending request, rather than to track 0.

`53 -> 65 -> 67 -> 98 -> 122 -> 124 -> 183 -> 14 -> 37`

| Segment | Distance |
| :--- | :---: |
| Up, 53 to 183 | 130 |
| **Return jump, 183 to 14** | 169 |
| Up, 14 to 37 | 23 |
| **Total** | **322 tracks** |

The savings are exactly the wasted edge travel:

| Pair | Full-sweep version | Last-request version | Saved |
| :--- | :---: | :---: | :---: |
| SCAN and LOOK | 331 | **299** | **32 tracks** |
| C-SCAN and C-LOOK | 382 | **322** | **60 tracks** |

**LOOK serves requests in exactly the same order as SCAN and always travels less than or equal to it, so SCAN is dominated.** It is strictly worse with no compensating property, and the only reason to teach SCAN first is that its invariant, "always continue to the edge", is simpler to state. The same holds for C-LOOK against C-SCAN. In an interview, saying that LOOK **dominates** SCAN rather than merely improving on it is the stronger formulation, because dominance means there is no workload on which you would choose SCAN.

#### The scorecard

| Algorithm | Total movement | Against FCFS | Starvation | Wait depends on position | Service order |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **SSTF** | **236** | 2.71x better | **yes** | yes | greedy nearest |
| **LOOK** | **299** | 2.14x better | no | yes | sweep, reverse at last request |
| **C-LOOK** | 322 | 1.99x better | no | **no** | sweep up, jump to lowest |
| **SCAN** | 331 | 1.93x better | no | yes | sweep, reverse at track 199 |
| **C-SCAN** | 382 | 1.68x better | no | **no** | sweep up, return to track 0 |
| **FCFS** | 640 | baseline | no | no | arrival order, never overtaken |

Read the first two columns together with the third. **SSTF wins on distance and is the only one that can starve a request**, and LOOK is 27% worse on distance while being bounded. That is the entire engineering decision in this problem, and the practical answer is LOOK or C-LOOK, which is why the Linux elevator was a LOOK variant for years and why `mq-deadline` keeps a sorted queue but adds expiry deadlines so that even its sorted ordering cannot starve anything.

One more comparison worth having ready, since interviewers ask about the worst case rather than the total. Measuring how far the arm travels before each individual request is served:

| Algorithm | Worst single request | Which request |
| :--- | :---: | :---: |
| FCFS | 640 tracks | 67, served last |
| LOOK | 299 tracks | 14 |
| SSTF | 236 tracks | 183 |

On this fixed queue SSTF has the best worst case too, which is exactly why the starvation argument has to be made with a stream of arrivals rather than with a snapshot. **A closed queue cannot demonstrate starvation**, and claiming it does is a mistake an interviewer may well probe.

#### Verify it

```python
"""
Disk head scheduling: FCFS, SSTF, SCAN, C-SCAN, LOOK and C-LOOK
on one request queue, with the wasted edge travel isolated.
"""

QUEUE = [98, 183, 37, 122, 14, 124, 65, 67]
START = 53
MAX_TRACK = 199


def cost(path):
    return sum(abs(b - a) for a, b in zip(path, path[1:]))


def fcfs():
    return [START] + QUEUE


def sstf():
    path, pending, cur = [START], list(QUEUE), START
    while pending:
        nxt = min(pending, key=lambda t: (abs(t - cur), t))
        path.append(nxt)
        pending.remove(nxt)
        cur = nxt
    return path


def scan():
    """Up to the physical end of the disk, then reverse."""
    up = sorted(t for t in QUEUE if t >= START)
    down = sorted((t for t in QUEUE if t < START), reverse=True)
    return [START] + up + [MAX_TRACK] + down


def cscan():
    """Up to the end, hard return to track 0, then up again."""
    up = sorted(t for t in QUEUE if t >= START)
    low = sorted(t for t in QUEUE if t < START)
    return [START] + up + [MAX_TRACK, 0] + low


def look():
    """SCAN, but reverse at the last REQUEST rather than the last track."""
    up = sorted(t for t in QUEUE if t >= START)
    down = sorted((t for t in QUEUE if t < START), reverse=True)
    return [START] + up + down


def clook():
    """C-SCAN, but jump to the lowest REQUEST rather than to track 0."""
    up = sorted(t for t in QUEUE if t >= START)
    low = sorted(t for t in QUEUE if t < START)
    return [START] + up + low


ALGOS = (("FCFS", fcfs), ("SSTF", sstf), ("SCAN", scan),
         ("C-SCAN", cscan), ("LOOK", look), ("C-LOOK", clook))


def service_distances(path):
    """How far the arm travels before each request is served."""
    seen, run, out = set(), 0, {}
    for a, b in zip(path, path[1:]):
        run += abs(b - a)
        if b in QUEUE and b not in seen:
            seen.add(b)
            out[b] = run
    return out


if __name__ == "__main__":
    span = max(QUEUE) - min(QUEUE)
    print(f"head at {START}, tracks 0..{MAX_TRACK}, queue {QUEUE}")
    print(f"above the head: {sorted(t for t in QUEUE if t >= START)}")
    print(f"below the head: {sorted(t for t in QUEUE if t < START)}")
    print(f"the requests span tracks {min(QUEUE)} to {max(QUEUE)}, "
          f"a range {span} tracks wide")

    print("\n-- service order and total head movement")
    for name, fn in ALGOS:
        p = fn()
        print(f"  {name:<8}{cost(p):>5} tracks   "
              f"{' '.join(str(x) for x in p)}")

    base = cost(fcfs())
    print(f"\n-- against FCFS ({base} tracks, "
          f"{base/span:.1f}x the width of the working range)")
    for name, fn in ALGOS[1:]:
        c = cost(fn())
        print(f"  {name:<8}{c:>5}   {base/c:.2f}x better, "
              f"{base - c} tracks saved")

    print("\n-- the edge travel that LOOK removes")
    print(f"  SCAN {cost(scan())} vs LOOK   {cost(look())}  -> "
          f"{cost(scan()) - cost(look())} tracks wasted reaching "
          f"track {MAX_TRACK}")
    print(f"  C-SCAN {cost(cscan())} vs C-LOOK {cost(clook())}  -> "
          f"{cost(cscan()) - cost(clook())} tracks wasted on the full sweep")
    assert cost(look()) <= cost(scan()), "LOOK must dominate SCAN"
    assert cost(clook()) <= cost(cscan()), "C-LOOK must dominate C-SCAN"
    assert look()[1:] == scan()[1:-3] + scan()[-2:], None
    print("  LOOK serves the same order as SCAN and travels no further, "
          "so SCAN is dominated")

    print("\n-- worst case for a single request")
    for name, fn in (("FCFS", fcfs), ("SSTF", sstf), ("LOOK", look),
                     ("C-LOOK", clook)):
        d = service_distances(fn())
        worst = max(d, key=d.get)
        print(f"  {name:<8}{d[worst]:>5} tracks before track {worst} "
              f"is served")
    print("  on a CLOSED queue SSTF also has the best worst case, which is "
          "why\n  starvation has to be argued with arriving requests, "
          "not with a snapshot")

    print("\n-- SSTF starvation needs a stream, so simulate one")
    cur, served, t = START, 0, 0
    pending = [183]                      # the distant request
    while t < 200:
        pending.append(60 + (t % 11))    # a trickle arriving near the head
        nxt = min(pending, key=lambda x: abs(x - cur))
        if nxt == 183:
            served = t
            break
        pending.remove(nxt)
        cur = nxt
        t += 1
    print(f"  track 183 served at step {served or 'never within 200 steps'}; "
          f"arm is parked at {cur}")
```

---

### What they ask next

**"Why is FCFS so bad here?"**
Because arrival order carries no information about position, so the arm reverses direction whenever the queue happens to alternate between high and low tracks. Three single moves account for 364 of the 640 tracks, all three reversals. The comparison that makes it land is that the requests span only **169 tracks**, so FCFS travels 3.8 times the width of the region it is working in. Its one virtue is strict fairness: no request is ever overtaken.

**"SSTF has the lowest total. Why not use it?"**
**Starvation.** The arm goes where requests are dense, and if new requests keep arriving near it, a request at track 183 never becomes the nearest one, so it is never selected regardless of how long it has waited. Elapsed time is simply not an input to the decision, exactly as with priority scheduling. Note that **a closed queue of eight requests cannot demonstrate this**, since SSTF terminates and serves everything; the argument requires a stream of arrivals, and saying so is the difference between understanding the objection and reciting it.

**"What does SCAN actually buy for the extra 95 tracks?"**
A bound. Because the arm traverses the disk on a fixed cycle, **no request waits more than two sweeps**, whatever arrives and whenever. Nothing can starve, because the arm is coming regardless of whether the request is attractive. That is a guarantee about the worst case bought with mean throughput, which is the same trade that aging buys in a priority scheduler.

**"Why does C-SCAN travel further than SCAN?"**
Because of the 199-track return seek that serves nothing. What it buys is **uniform waiting**: under SCAN the arm reverses, so tracks it has just covered are served again immediately while the far end waits a full double sweep, meaning waiting time depends on position and the middle of the disk is visited about twice as often as the edges. Under C-SCAN every track is visited exactly once per cycle and the maximum wait is one sweep wherever you are. **It trades mean for variance**, which is correct when a predictable latency bound matters more than total throughput.

**"How much do LOOK and C-LOOK save, and is there any reason to prefer SCAN?"**
LOOK saves 32 tracks, the travel from 183 to 199 and back, and C-LOOK saves 60. There is no reason to prefer SCAN: **LOOK serves requests in exactly the same order and always travels less than or equal**, so SCAN is **dominated** rather than merely beaten. Dominance is the right word, because it means no workload exists on which SCAN is the better choice. The only reason SCAN is taught is that "always continue to the edge" is a simpler invariant to state.

**"Is total head movement the right objective?"**
It is a proxy, and a slightly optimistic one for SSTF. Real **seek time** is not linear in distance, because each seek pays a fixed acceleration and settling cost, so two 10-track seeks cost more than one 20-track seek. An algorithm like SSTF that performs many short seeks therefore looks better on a track count than on a stopwatch. **Rotational latency**, about 4 ms at 7,200 rpm, is also ignored entirely here, and a real scheduler can reorder within a track to account for it.

**"Does any of this apply to an SSD?"**
No, and this is the most useful thing to say. There is no arm, so **seek time is essentially zero** and track distance is meaningless, and in any case the logical blocks the kernel sees are remapped by the drive's **flash translation layer** to physical locations the kernel cannot know. Reordering by block address optimises a quantity that does not exist. What matters instead is keeping queue depth high enough to use the device's internal parallelism, and not amplifying writes.

**"So what does Linux use?"**
For NVMe, usually **`none`**, formerly `noop`, which does no reordering at all. **`mq-deadline`** keeps the sorted-queue idea but attaches an expiry deadline to every request, so a request that has waited too long is promoted regardless of position, which is precisely the aging fix for SSTF's starvation. **BFQ** allocates I/O bandwidth proportionally between processes, which is fairness between applications rather than between tracks. **Kyber** throttles to meet latency targets. None of them is an elevator, and the elevator survives only as the sorted queue inside `mq-deadline`, where it still helps on real spinning disks.

**"If you had to pick one of the six, which?"**
**C-LOOK** for a general-purpose spinning disk, or LOOK if throughput matters more than predictability. Both get most of SSTF's benefit, 299 and 322 tracks against SSTF's 236 and FCFS's 640, while being immune to starvation, and C-LOOK additionally makes the wait independent of position. Picking SSTF is defensible only with a deadline mechanism bolted on, which is what `mq-deadline` is.

**The common wrong answer** is choosing SSTF because it has the best number, without the starvation argument, or making the starvation argument against the closed queue of eight requests, which cannot show it. Next is forgetting that SCAN and C-SCAN travel to track 199 even though nothing was requested there, which quietly computes LOOK's 299 and calls it SCAN's 331. Third is treating C-SCAN as a straightforward improvement on SCAN when it travels 51 tracks further and buys uniformity rather than speed. And last is presenting any of it as current practice: this is spinning-disk mechanics, and the honest closing sentence is that the arm no longer exists.

---

### Say this in the interview

*"First I would sort the queue around the head, because every algorithm except FCFS works from that. Above 53 are 65, 67, 98, 122, 124 and 183; below are 37 and 14. And one figure to compare everything against: the requests span tracks 14 to 183, a range 169 tracks wide, which is roughly the least any algorithm could travel.*

*FCFS serves in arrival order: 53 to 98 to 183 to 37 to 122 to 14 to 124 to 65 to 67. Adding the absolute differences gives 640 tracks. The way to say why that is bad is that it travels 3.8 times the width of the region it is working in, and three single moves account for 364 of the 640, all of them reversals. FCFS is not doing anything stupid at any step, it just has no information, because arrival order says nothing about position. Its only virtue is strict fairness: no request is ever overtaken.*

*SSTF always goes to the nearest pending request: 53 to 65 to 67 down to 37 to 14, then the long haul up to 98, then 122, 124, 183. That is 236 tracks, 2.71 times better than FCFS and the best total on the page. Two things about it. The 84-track jump from 14 up to 98 is the greedy algorithm's bill: having gone down to clear the low requests the arm is stranded at the bottom with everything else above it, which a directional sweep never incurs. And the real objection is starvation, which I would be careful to argue properly: this closed queue of eight cannot demonstrate it, because SSTF terminates and serves everything. The argument needs a stream. If new requests keep arriving in the sixties while the arm is down there, track 183's distance never becomes the smallest, so it is never selected no matter how long it has waited, because elapsed waiting time is not an input to the decision. That is the same shape as starvation under priority scheduling.*

*SCAN, the elevator algorithm, sweeps up serving everything it passes to 183, continues to 199, then reverses and comes down through 37 and 14. Up is 130, the 183 to 199 leg is 16, the sweep down is 185, so 331 tracks. Worse than SSTF, better than FCFS, and what it buys for the extra travel is a bound: because the arm traverses the disk on a fixed cycle, no request waits more than two sweeps whatever arrives and whenever, so nothing can starve. The arm is coming regardless of whether the request is attractive.*

*C-SCAN sweeps one way only: up to 183, on to 199, then a hard return to track 0 serving nothing, then up again through 14 and 37. That is 130 plus 16 plus the 199-track return plus 37, so 382 tracks, the worst of the reordering algorithms. The return buys exactly one thing, uniformity. Under SCAN the arm reverses, so the tracks it has just covered get served again straight away while the far end waits a full double sweep, which means waiting time depends on position and the middle of the disk is visited about twice as often as the edges. Under C-SCAN every track is visited once per cycle and the maximum wait is one sweep wherever you are. So C-SCAN trades mean for variance, and whether that is right depends on whether you want throughput or a latency bound.*

*LOOK and C-LOOK change one rule: stop at the last request rather than at the end of the disk. LOOK goes up to 183 and reverses, so 130 up plus 169 down, which is 299, saving the 32 tracks SCAN wastes reaching 199 and coming back. C-LOOK goes up to 183 then jumps straight to 14 rather than to 0, so 130 plus 169 plus 23, which is 322, saving 60. The strong way to put this is that LOOK dominates SCAN: it serves requests in exactly the same order and always travels less than or equal, so there is no workload on which you would choose SCAN. The only reason SCAN is taught first is that always continuing to the edge is a simpler invariant to state.*

*So the scoreboard is SSTF 236, LOOK 299, C-LOOK 322, SCAN 331, C-SCAN 382, FCFS 640, and the engineering decision is between the first two: SSTF is 27% better on distance and is the only one that can starve a request. In practice I would pick C-LOOK for a general-purpose spinning disk, or LOOK if throughput mattered more than predictability.*

*Two caveats I would add if there is room. Total head movement is a proxy and slightly flatters SSTF, because real seek time is not linear in distance: each seek pays a fixed acceleration and settling cost, so two ten-track seeks cost more than one twenty-track seek, and an algorithm doing many short seeks looks better on a track count than on a stopwatch. Rotational latency, about four milliseconds at 7,200 rpm, is ignored here entirely.*

*And the bigger caveat: none of this applies to an SSD. There is no arm, so seek time is essentially zero and track distance is meaningless, and the logical blocks the kernel sees are remapped by the drive's flash translation layer to physical locations the kernel cannot know, so reordering by block address optimises a quantity that does not exist. What matters is queue depth and write amplification. Linux reflects that directly: none, formerly noop, does no reordering and is the usual choice for NVMe; mq-deadline keeps the sorted queue but attaches an expiry to each request so nothing starves, which is exactly the aging fix for SSTF; BFQ allocates bandwidth between processes rather than between tracks; and kyber throttles to hit latency targets. The elevator survives only as that sorted queue inside mq-deadline, where it still earns its keep on an actual spinning disk."*
