---
id: 2-process-states-and-lifecycle
title: "Process Lifecycle: The 5-State & 7-State Models"
description: "Explore process lifecycles, the 5-state and 7-state models, long/medium/short-term schedulers, and Linux process state flags."
sidebar_position: 2
sidebar_class_name: sidebar-easy
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What are the different states a process transitions through? How does the 7-state model handle memory swapping, and what are the roles of the long-term, medium-term, and short-term schedulers?"

An OS is juggling hundreds of programs with a handful of CPU cores. To do that, every process moves through a small set of states — and the OS has separate schedulers that decide when it moves between them.

---

### The analogy: a clinic

Think of a process as a patient at a clinic:

- **New** — filling out admission forms at reception.
- **Ready** — sitting in the waiting room, waiting for a doctor.
- **Running** — in the exam room with the doctor (the CPU).
- **Blocked (Waiting)** — sent for an X-ray. Can't continue until results come back.
- **Suspend Blocked** — the waiting room is overcrowded (RAM is full), so the patient waiting on X-ray results gets sent to a tent outside (swapped to disk).
- **Suspend Ready** — the X-ray result is in, but the waiting room is still full, so they wait in the tent until a seat opens up.
- **Terminated** — done, patient leaves.

That's the whole lifecycle. Textbooks call the first five the "5-state model." Real systems like Linux and Windows add the two suspend states to handle memory pressure, making it the "7-state model."

---

### The core flow

<Diagram>
<Row>
<Box title="New" accent="#a1a1aa"><Field icon="🆕" code="created" hint="admitted by long-term scheduler" variant="neutral" /></Box>
<Arrow />
<Box title="Ready" accent="#60a5fa"><Field icon="⏳" code="waiting for CPU" variant="neutral" /></Box>
<Arrow label="dispatched" />
<Box title="Running" accent="#34d399"><Field icon="▶️" code="on the CPU" variant="neutral" /></Box>
<Arrow label="exit()" />
<Box title="Terminated" accent="#fb7185"><Field icon="🏁" code="done" variant="neutral" /></Box>
</Row>
</Diagram>

A running process can also get knocked back to **Ready** (timer interrupt — its turn is up) or sent to **Blocked** (it asked for I/O and has to wait). Once the I/O finishes, Blocked goes back to Ready.

When RAM is tight, the OS can swap a waiting process out to disk entirely — that's what adds **Suspend Ready** and **Suspend Blocked** on top of Ready and Blocked.

---

### The three schedulers behind this

| Scheduler | Also called | How often it runs | What it does |
| :--- | :--- | :--- | :--- |
| **Long-Term** | Job Scheduler | Seconds / minutes | Decides which programs get loaded into memory at all — controls how many programs run at once. |
| **Short-Term** | CPU Scheduler | Milliseconds | Picks which ready process gets the CPU next. Has to be extremely fast. |
| **Medium-Term** | Swapper | Hundreds of ms | Swaps processes out to disk when RAM runs low, and back in when there's room. |

---

### What each state actually means

1. **New** — the process's control block (PCB) exists; the program itself is still on disk.
2. **Ready** — loaded into RAM, sitting in the ready queue, waiting for CPU time.
3. **Running** — actually executing on a core right now.
4. **Blocked (Waiting)** — can't continue until something external finishes: disk I/O, a network call, a lock.
5. **Suspend Ready** — ready to run, but swapped out to disk because RAM was full.
6. **Suspend Blocked** — waiting on an event *and* swapped out to disk.
7. **Terminated** — finished or killed. Sticks around briefly as a "zombie" until the parent process reads its exit code.

---

### Linux process state flags (`ps`, `top`, `/proc`)

Linux shows these as single letters:

- **`R`** — running, or sitting in the run queue ready to run.
- **`S`** — sleeping, waiting for an event (interruptible).
- **`D`** — sleeping on hardware I/O (uninterruptible). Can't even be killed with `kill -9`.
- **`T`** — stopped, usually by `Ctrl+Z` or a debugger.
- **`Z`** — zombie: terminated, waiting for its parent to collect the exit status.

> 💡 **Watch out for `D`.** A process stuck waiting on a hung NFS server sits in `D` state ignoring every signal, including `kill -9`. It holds its resources until the server comes back or the machine reboots — there's no way around it.

---

### Say this in the interview

*"A process moves through New, Ready, Running, Blocked, and Terminated. The long-term scheduler controls admission, the short-term scheduler hands out CPU time, and when RAM gets tight, the medium-term scheduler swaps processes to disk — which is where the Suspend Ready and Suspend Blocked states in the 7-state model come from."*

---

### Code: watching a real process change state

```python
import os
import time
import subprocess

def get_process_state(pid: int) -> str:
    """Reads the state character from the Linux /proc filesystem."""
    try:
        with open(f"/proc/{pid}/stat", "r") as f:
            fields = f.read().split()
            # The state character is the 3rd field in /proc/[pid]/stat
            return fields[2]
    except FileNotFoundError:
        return "TERMINATED"

if __name__ == "__main__":
    current_pid = os.getpid()
    print(f"[Main] Current Process PID: {current_pid}")
    print(f"[Main] State while running: {get_process_state(current_pid)}")  # 'R'

    # Fork a child to observe sleeping / blocked state
    child_pid = os.fork()
    if child_pid == 0:
        # Child sleeps (transitions from Running to Interruptible Sleep 'S')
        time.sleep(2)
        os._exit(0)
    else:
        # Parent inspects child state while it sleeps
        time.sleep(0.5)
        print(f"[Parent] Child PID {child_pid} state during sleep: {get_process_state(child_pid)}") # 'S'
        
        # Wait for child to exit
        os.waitpid(child_pid, 0)
        print(f"[Parent] Child finished and reaped.")
```
