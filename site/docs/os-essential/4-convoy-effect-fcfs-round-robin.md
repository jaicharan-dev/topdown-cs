---
id: 4-convoy-effect-fcfs-round-robin
title: "The Convoy Effect: FCFS Bottlenecks & Round Robin Solutions"
description: "Understand the Convoy Effect under FCFS, mathematical Gantt chart proofs, average waiting time calculations, and Round Robin quantum tuning."
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the convoy effect, why does FCFS cause it, and how does Round Robin solve it? Walk me through a mathematical Gantt chart comparison, and explain how to tune the time quantum."

Put a long CPU-bound job at the front of a non-preemptive queue, and every short job behind it is stuck waiting — even if each of them only needs a few milliseconds. That's the convoy effect, and it tanks both average wait time and overall throughput, because I/O devices sit idle the whole time.

---

### The analogy: a single-lane highway

A slow tractor-trailer (a 24-minute CPU-bound process) gets on a single-lane road with a strict no-passing rule. Three fast sports cars (3-minute I/O-bound processes) are stuck right behind it. Each one could reach its exit almost instantly — but they're all trapped crawling behind the truck. That trailing line is the convoy.

---

### Why FCFS causes this

1. A long CPU-bound process grabs the CPU.
2. Short I/O-bound processes finish their I/O and land in the ready queue.
3. FCFS is non-preemptive, so nobody can interrupt the long process.
4. The short processes just sit there — and so do the disk and network devices they'd otherwise be using.
5. Once the long process finally finishes, the short ones blaze through in milliseconds and all dump requests on the I/O devices at once — leaving the CPU idle right after.

---

### Proving it with numbers

Three processes arrive at the same time:

- **P1** (CPU-bound): 24 ms
- **P2** (I/O-bound): 3 ms
- **P3** (I/O-bound): 3 ms

#### FCFS (order: P1, P2, P3)

```
|          P1 (24ms)          |  P2 (3ms) |  P3 (3ms) |
0                             24          27          30
```

Waiting times: P1 = 0, P2 = 24, P3 = 27 → **average wait = 51 / 3 = 17.0 ms**

#### Round Robin (quantum = 4ms)

```
|  P1 (4ms) |  P2 (3ms) |  P3 (3ms) |     P1 remaining (20ms)     |
0           4           7          10                            30
```

P1 runs 4ms and gets preempted. P2 finishes at t=7. P3 finishes at t=10. P1 resumes and finishes at t=30.

Waiting times: P1 = 6, P2 = 4, P3 = 7 → **average wait = 17 / 3 = 5.67 ms**

Same workload, same total time — but Round Robin cuts average wait time by about 66%, just by slicing up the CPU-bound job instead of letting it run uninterrupted.

---

### Tuning the time quantum

Round Robin's performance lives or dies on the size of the quantum:

- **Too large** → long jobs hog the CPU again, and you're basically back to FCFS.
- **Too small** → the OS spends more time context-switching than actually running code.
- **Just right** → in practice (Linux CFS and friends), aim for a quantum where about 80% of CPU bursts finish within a single slice — usually somewhere between 10ms and 100ms.

---

### Say this in the interview

*"The convoy effect happens under non-preemptive FCFS when a long CPU-bound process blocks a line of short I/O-bound processes, hurting average wait time and leaving I/O devices idle. Round Robin fixes this with time-slicing, but the quantum has to be tuned — too large and it degrades back into FCFS, too small and context-switch overhead dominates."*

---

### Code: FCFS vs. Round Robin simulator

```python
def calculate_fcfs(burst_times):
    waiting_times = [0] * len(burst_times)
    for i in range(1, len(burst_times)):
        waiting_times[i] = waiting_times[i - 1] + burst_times[i - 1]
    awt = sum(waiting_times) / len(burst_times)
    return waiting_times, awt

def calculate_rr(burst_times, quantum):
    rem_bt = list(burst_times)
    t = 0
    waiting_times = [0] * len(burst_times)
    
    while True:
        done = True
        for i in range(len(burst_times)):
            if rem_bt[i] > 0:
                done = False
                if rem_bt[i] > quantum:
                    t += quantum
                    rem_bt[i] -= quantum
                else:
                    t += rem_bt[i]
                    waiting_times[i] = t - burst_times[i]
                    rem_bt[i] = 0
        if done:
            break
            
    awt = sum(waiting_times) / len(burst_times)
    return waiting_times, awt

if __name__ == "__main__":
    processes = [24, 3, 3] # P1 (CPU-bound), P2, P3 (I/O-bound)
    
    _, awt_fcfs = calculate_fcfs(processes)
    _, awt_rr = calculate_rr(processes, quantum=4)
    
    print(f"FCFS Average Waiting Time:        {awt_fcfs:.2f} ms") # 17.00 ms
    print(f"Round Robin Average Waiting Time:  {awt_rr:.2f} ms")   # 5.67 ms
```
