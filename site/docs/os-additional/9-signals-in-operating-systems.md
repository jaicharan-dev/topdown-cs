---
id: 9-signals-in-operating-systems
title: "Unix Signals: Asynchronous Notification, Default Actions & Handlers"
description: "How the kernel delivers signals like SIGINT, SIGTERM, and SIGKILL to a running process, and why printf() or malloc() inside a handler can deadlock it."
sidebar_position: 9
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What are signals in Unix/Linux? How do they differ from standard IPC, how does the kernel physically dispatch a signal handler onto user space, and why is calling `printf()` or `malloc()` inside a signal handler dangerous?"

A signal is the kernel tapping a process on the shoulder: "something happened, deal with it now." Unlike a pipe or shared memory, it carries almost no data — historically just a number — and it interrupts whatever the process was doing instead of waiting to be read.

---

### The analogy: the student and the fire alarm

A student (a process) is taking a 3-hour exam (running instructions):

- **A tap on the shoulder (`SIGINT`, `SIGTERM`):** the teacher says "sharpen your pencil." The student pauses, handles it (a signal handler), and resumes the exam exactly where they left off.
- **The fire alarm (`SIGKILL`):** the building evacuates. No negotiating — the student is walked out immediately. The exam is over.
- **The calculator explodes (`SIGSEGV`):** the student divides by zero and the hardware itself faults. There's no continuing from this.

---

### A signal is sent, pending, then delivered — not instant

It's easy to assume a signal fires the instant it's sent. It doesn't — there are three separate steps:

1. **Generation** — something triggers it: a hardware exception, a `Ctrl+C` in the terminal, or another process calling `kill(pid, sig)`.
2. **Pending** — the kernel just flips a bit in the process's pending-signal bitmask. If the process is currently running, the signal waits.
3. **Delivery** — the kernel only actually runs the handler when the process is about to cross back from kernel mode into user mode (returning from a syscall, a timer tick, a page fault, etc).

---

### The signals worth knowing cold

| Signal | Number | Default action | Catchable? | Typical trigger |
| :--- | :--- | :--- | :--- | :--- |
| **`SIGINT`** | 2 | Terminate | Yes | `Ctrl+C` in the terminal |
| **`SIGQUIT`** | 3 | Terminate + core dump | Yes | `Ctrl+\` — dumps memory for debugging |
| **`SIGKILL`** | 9 | Terminate | **No** | `kill -9` — the kernel's hard kill switch |
| **`SIGSEGV`** | 11 | Terminate + core dump | Yes | Dereferencing an invalid pointer |
| **`SIGTERM`** | 15 | Terminate | Yes | `kill pid` / systemd — the polite "please shut down" |
| **`SIGCHLD`** | 17 | Ignore | Yes | A child process exited or stopped |
| **`SIGSTOP`** | 19 | Pause | **No** | Forcibly suspends the process |
| **`SIGTSTP`** | 20 | Pause | Yes | `Ctrl+Z` |

Only two signals can never be caught, blocked, or ignored: **`SIGKILL`** and **`SIGSTOP`**. Everything else, a process can intercept.

---

### How the kernel runs your handler without giving it kernel privileges

Your handler is ordinary user code, but the kernel is the one that notices the pending signal while it's in Ring 0. Here's the trick it uses to jump into your code anyway:

<Diagram>
<Row>
<Box title="Kernel" accent="#818cf8"><Field icon="🧵" code="injects fake stack frame" hint="sigcontext: saved registers, RIP" variant="neutral" /></Box>
<Arrow label="sysret" />
<Box title="Handler (Ring 3)" accent="#60a5fa"><Field icon="▶️" code="runs your signal handler" variant="neutral" /></Box>
<Arrow label="sigreturn()" />
<Box title="Kernel" accent="#818cf8"><Field icon="↩️" code="restores original registers" hint="resumes app at saved RIP" variant="neutral" /></Box>
</Row>
</Diagram>

1. **Stack frame injection:** the kernel writes a fake frame onto your own user stack, holding a `sigcontext` — your original registers, flags, and instruction pointer, as they were right before the interrupt.
2. **Redirection:** when the kernel returns to user mode via `sysret`, it points `RIP` at your registered handler function instead of back where you were.
3. **The trampoline:** the return address baked into that fake frame points to a tiny kernel-provided stub, `__restore_rt`.
4. **`sigreturn()`:** when your handler finishes and returns, it lands on that stub, which calls the `sigreturn()` syscall.
5. The kernel catches that, restores your original registers from the saved `sigcontext`, and you resume exactly where you were interrupted — as if nothing happened.

---

### Why `malloc()` and `printf()` inside a handler can deadlock you

A classic interview trap: *"can you call `malloc()` or `printf()` inside a signal handler?"* No — and the reason is worth knowing, not just the rule.

`malloc()` and `printf()` both take an internal lock to protect the heap or the output buffer. Say your main thread is already inside `malloc()`, holding that lock, when a signal arrives. The kernel runs the handler on that *same* thread — and if the handler also calls `malloc()`, it tries to grab a lock it's already holding. The thread is now waiting for itself to finish. That's a permanent deadlock.

The fix: only call functions from POSIX's short list of signal-safe functions inside a handler (`write()`, `_exit()`, and a few others). The standard, safe pattern is to just set a flag and let your normal code check it:

```c
static volatile sig_atomic_t shutdown_requested = 0;

void handle_sigterm(int sig) {
    shutdown_requested = 1; // Atomic, async-safe assignment
}
```

---

### Say this in the interview

*"A signal is an asynchronous notification from the kernel, not a data channel — it's generated, marked pending in the process's bitmask, and delivered only when the kernel is about to return to user mode. The kernel runs the handler by injecting a fake stack frame with the saved registers, pointing execution at your handler, and using a sigreturn trampoline to restore the original state afterward. SIGKILL and SIGSTOP can never be caught. And signal handlers must stick to async-signal-safe functions — calling malloc() or printf() inside one risks deadlocking against a lock the same thread already holds."*

---

### Code: catching signals and shutting down cleanly

```python
"""
Unix Signal Handling & Graceful Shutdown Simulator
Demonstrates:
  1. Catching asynchronous signals (SIGINT, SIGTERM)
  2. The atomic flag pattern for async-safety
  3. Clean termination and resource disposal
"""

import signal
import time
import sys

class GracefulServer:
    def __init__(self):
        self.running = True
        self.tasks_completed = 0
        self._setup_signals()

    def _setup_signals(self):
        # Register handlers for SIGINT (Ctrl+C) and SIGTERM (kill)
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        print("Registered handlers for SIGINT (2) and SIGTERM (15).")

    def _signal_handler(self, signum, frame):
        sig_name = signal.Signals(signum).name
        print(f"\n[SIGNAL INTERRUPT] Received {sig_name} ({signum})!")
        print("  -> Setting shutdown flag. Completing in-flight transactions...")
        # Strictly toggle flag (Async-Signal-Safe pattern)
        self.running = False

    def run_event_loop(self, max_cycles: int = 5):
        print("Server running event loop (Simulating active requests)...")
        for i in range(1, max_cycles + 1):
            if not self.running:
                break
            print(f"  Processing request #{i}...")
            self.tasks_completed += 1
            time.sleep(0.1)

            # Programmatically fire a simulated SIGTERM on cycle 3
            if i == 3 and self.running:
                print("  [Simulating OS sending SIGTERM to self...]")
                # In Python, raise signal on the main thread
                signal.raise_signal(signal.SIGTERM)

        self._cleanup()

    def _cleanup(self):
        print("\n--- Executing Graceful Shutdown ---")
        print(f"Flushing logs... (Total requests served: {self.tasks_completed})")
        print("Closing database connections...")
        print("Server shutdown complete. Process exiting cleanly.")


def main():
    print("=== Unix Signal Handling Simulation ===\n")
    server = GracefulServer()
    server.run_event_loop(max_cycles=5)

if __name__ == "__main__":
    main()
```
