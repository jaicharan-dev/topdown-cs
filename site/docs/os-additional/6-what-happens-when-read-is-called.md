---
id: 6-what-happens-when-read-is-called
title: "What Happens When read() Is Called"
description: "One line of C, traced from a register down to a disk controller writing into memory while the CPU does something else"

sidebar_position: 6
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What happens under the hood when a user-level program calls read()? Trace the execution path through user space, CPU registers, system call dispatch, VFS, page cache, DMA, and hardware interrupts."

---

### Picture it

You ask a librarian for a page from a book.

**You do not say "walk to shelf 7".** You hand over a ticket with a number on it and say "the thing this ticket refers to". The number means nothing by itself; the librarian has a list that turns it into an actual book. That indirection is the whole reason your ticket cannot be used to fetch someone else's book.

**First, the librarian checks the pile on the desk.** Popular books are kept there, already open. If yours is in the pile, they copy out the page and hand it over, and **nothing else in this story happens**. No shelves, no walking, no waiting. This is the usual outcome, and it is why the whole operation is normally over in a microsecond.

**If it is not on the desk, the book must be fetched from the archive**, which is slow. Two things happen that are worth noticing.

The librarian does not carry the book back themselves. They send a request to the archive, and the **archive delivers it directly onto the desk**. Nobody walks. The librarian's hands are free the entire time.

And you are not left standing there. **You are sent to sit down**, and the librarian serves other people. When the book lands on the desk, **a bell rings**, the librarian finds your name on the waiting list, and calls you back.

**Then you get your page, and here is the last detail.** The book now sits on the desk permanently, and the librarian **copies the page onto a slip for you**. So the content was written down twice: once into the desk pile, once onto your slip. That second copy is pure cost for you, and it is exactly what the awkward, expert-only shortcuts exist to avoid.

---

### The proper terms

#### Stage 1: user space and the C library

The program calls `read(fd, buf, count)`, which is a wrapper in glibc, not the system call itself.

The wrapper places the arguments in the registers the System V AMD64 calling convention reserves for system calls:

```text
RAX = 0        __NR_read, the system call number
RDI = fd
RSI = buf
RDX = count
```

and executes the **`SYSCALL`** instruction.

#### Stage 2: the mode switch

The CPU switches to **ring 0**, saves the return address in **`RCX`** and the flags in **`R11`**, and jumps to the address in the **`LSTAR`** model-specific register, which the kernel wrote at boot.

Kernel entry code switches to the task's **kernel stack** and saves the user registers into a **`pt_regs`** structure. This is a **mode switch**, not a context switch: the same process continues in the same address space.

The kernel then validates the system call number against the table bounds and dispatches through the **`sys_call_table`** to `ksys_read`.

#### Stage 3: turning a descriptor into a file

**`fd` is an integer index**, and this indirection is the security boundary.

The kernel looks it up in the process's **file descriptor table**, `files_struct` and its `fdtable`, to obtain a **`struct file`** pointer. That structure holds the current offset `f_pos`, the flags, and crucially **`f_op`**, a pointer to a table of **function pointers**.

A descriptor that is out of range or unopened simply has no entry, so it returns `-EBADF`. A process cannot name another process's files, because the number is only meaningful inside its own table.

#### Stage 4: the VFS and polymorphic dispatch

**`vfs_read()`** performs permission and security checks, including LSM hooks for SELinux or AppArmor, and then does the thing that defines the Virtual File System:

```c
file->f_op->read_iter(kiocb, iter);
```

It calls through a function pointer rather than into any particular filesystem. That single line is why the same `read()` works on **ext4, XFS, NFS, a pipe, a socket, `/proc`, a tty or a device node**: each provides its own `f_op` table. It is object-oriented dispatch implemented in C with a struct of function pointers, and it is the VFS's entire purpose.

For a regular file opened for buffered I/O on ext4, the call lands in **`generic_file_read_iter`** and then **`filemap_read`**.

#### Stage 5: the page cache, where most reads end

The kernel converts `f_pos` into a **page index** and looks it up in the inode's **`address_space`**, an **XArray** mapping file offsets to cached pages.

**On a hit**, the data is already in RAM. The kernel calls **`copy_to_user`**, which validates that the destination lies within the caller's address space and copies the bytes. `f_pos` advances, and the call returns.

**No disk is touched. No interrupt occurs. The process never sleeps.** This is the overwhelmingly common case, and it is why a `read()` typically costs about a microsecond rather than milliseconds. Any answer that goes straight to the disk has described the **exception**, not the normal path.

**On a miss**, the kernel allocates a page, inserts it into the page cache, and triggers the filesystem to fill it. It also starts **readahead** for following pages, because sequential access is detected and anticipated.

#### Stage 6: the filesystem and the block layer

**ext4 maps the file offset to a device block.** Modern ext4 uses an **extent tree** stored in the inode, mapping contiguous ranges of file blocks to contiguous ranges of device blocks, which is far more compact than the old indirect-block scheme.

The result is a **logical block address**, which the kernel wraps in a **`bio`**, a structure describing which **pages in memory** should be filled from which sectors on the device.

The `bio` goes to the **block layer**, where the multi-queue infrastructure, **blk-mq**, places it on a per-CPU software queue and then a hardware queue. An **I/O scheduler** may merge adjacent requests and reorder them: `mq-deadline` or `BFQ` on rotational devices, and often **`none`** on NVMe, where the device's own parallelism makes reordering counterproductive.

#### Stage 7: DMA, where the CPU stops being involved

The driver programs the device with the **physical addresses of the target pages** and rings a doorbell register.

Then the crucial part: the device performs **DMA**, direct memory access, writing the data **straight into those page cache pages in RAM**, across the bus, without the CPU copying anything.

This is the point candidates most often miss. The CPU **sets up** the transfer and is then **completely uninvolved** in moving the bytes. On modern systems an **IOMMU** translates the device's addresses, so a device can only write where it was authorised to.

#### Stage 8: the process sleeps and the CPU does other work

The kernel calls **`io_schedule()`**, which puts the task into **`TASK_UNINTERRUPTIBLE`**, the **`D` state** visible in `ps`, and calls `schedule()`.

That is a **context switch**: the CPU runs something else entirely. The waiting process consumes nothing. This is the distinction worth drawing from the earlier stages, because up to here everything was a **mode** switch within one process; only now does a context switch occur.

#### Stage 9: the completion interrupt

When the transfer finishes, the device raises an **interrupt**, normally **MSI-X**, which can be steered to a chosen core so the completion is handled near the submitting CPU.

The handler must be short, because it runs with interrupts disabled and nothing else can proceed on that core, so the work is split:

**The top half** acknowledges the device and schedules deferred work.

**The bottom half**, a **softirq** such as `BLOCK_SOFTIRQ`, or a threaded IRQ handler, does the real work: it runs the `bio`'s completion callback, marks the page **up to date**, unlocks it, and wakes the sleeping task.

#### Stage 10: the return journey

The scheduler eventually runs the task again. It finds the page now present, calls **`copy_to_user`** to copy from the page cache into the user buffer, advances `f_pos`, and places the byte count in **`RAX`**.

**`SYSRET`** returns to ring 3. The glibc wrapper checks for a small negative value, and if so sets **`errno`** and returns -1.

#### The two copies, and why the shortcuts exist

Notice that the data was written to memory **twice**: once by DMA into the **page cache**, and once by `copy_to_user` into the **user buffer**.

The page cache copy is valuable, since it serves every later reader and every other process. The second copy is **pure CPU and memory bandwidth** spent duplicating bytes that are already in RAM.

That cost is the reason for the alternatives:

**`O_DIRECT`** bypasses the page cache entirely, DMAing straight into the user buffer. One copy instead of two, at the price of losing all caching, so it suits databases that manage their own.

**`mmap`** maps the page cache pages into the process's address space, so reads touch the cached pages directly with no copy at all, paying page faults instead.

**`sendfile`** and **`splice`** move data between descriptors **entirely inside the kernel**, never crossing into user space, which is how a web server ships a file to a socket with zero copies into user memory.

**`io_uring`** removes a different cost, the per-operation system call, by using shared submission and completion ring buffers.

---

### In code

```text
The whole path, with the layer named at each step:

  USER SPACE
    read(fd, buf, n)                    glibc wrapper, not the syscall
      RAX = 0 (__NR_read), RDI = fd, RSI = buf, RDX = n
      SYSCALL
  ----------------------------------------------- mode switch in
  KERNEL: DISPATCH
    CPU: ring 0, RIP from LSTAR, return addr in RCX, flags in R11
    switch to the kernel stack, save user regs into pt_regs
    validate the syscall number -> sys_call_table[0] -> ksys_read

  KERNEL: DESCRIPTOR
    fd is an INDEX into this process's fdtable
      -> struct file *   (f_pos, f_flags, f_op)
      -> out of range or unopened = -EBADF
      -> a process cannot name another process's files

  KERNEL: VFS
    vfs_read(): permission + LSM checks, then
    file->f_op->read_iter(...)        <- A FUNCTION POINTER
      ^ this one line is why the same read() works on ext4, XFS, NFS,
        a pipe, a socket, /proc, a tty or a device node

  KERNEL: PAGE CACHE
    f_pos -> page index -> look up the inode's address_space (XArray)
      HIT  -> copy_to_user, advance f_pos, RETURN
              no disk, no interrupt, no sleep       <- THE COMMON CASE
      MISS -> allocate a page, insert it, trigger readahead, continue
  ----------------------------------------------- only on a MISS:
  KERNEL: FILESYSTEM + BLOCK LAYER
    ext4 extent tree: file offset -> logical block address
    build a bio: which PAGES to fill from which SECTORS
    blk-mq: software queue -> hardware queue
    I/O scheduler may MERGE and REORDER
      mq-deadline / BFQ on rotational, often `none` on NVMe

  DRIVER + DEVICE
    program the device with the PHYSICAL addresses, ring the doorbell
    the device DMAs data STRAIGHT INTO the page cache pages
      -> the CPU copies NOTHING here. It only set up the transfer.
      -> an IOMMU restricts where the device may write

  KERNEL: SLEEP
    io_schedule() -> TASK_UNINTERRUPTIBLE (the D state in ps)
    schedule() -> CONTEXT SWITCH, the CPU runs something else
      ^ everything before this was a MODE switch within one process.
        ONLY NOW is there a context switch.

  DEVICE -> INTERRUPT
    MSI-X, steered to a chosen core
    top half:    acknowledge, schedule deferred work (must be short)
    bottom half: BLOCK_SOFTIRQ or a threaded handler
                 run the bio completion, mark the page up to date,
                 unlock it, WAKE THE TASK

  KERNEL: RETURN
    task runs again, copy_to_user from page cache -> user buffer
    advance f_pos, result in RAX, SYSRET
  ----------------------------------------------- mode switch out
  USER SPACE
    glibc: if RAX is a small negative value { errno = -RAX; return -1; }
```

```c
// The VFS dispatch, which is the heart of stage 4
struct file_operations {
    ssize_t (*read_iter)(struct kiocb *, struct iov_iter *);
    ssize_t (*write_iter)(struct kiocb *, struct iov_iter *);
    int     (*open)(struct inode *, struct file *);
    /* ... */
};

// ext4 provides one, a socket provides another, a pipe another.
// vfs_read() does not know or care which:
file->f_op->read_iter(&kiocb, &iter);

// object-oriented dispatch, in C, through a struct of function
// pointers. That is the entire purpose of the VFS layer.
```

```text
Why fd is an integer and not a pointer:

  process A                       process B
    fd 3 -> files->fd[3] -----+     fd 3 -> files->fd[3] -----+
                              |                               |
                              v                               v
                      struct file (/etc/passwd)    struct file (socket)

  the NUMBER is meaningless outside the process's own table, so
  A cannot name B's files by guessing an integer.
  out of range or unopened -> -EBADF, with no way to probe further.
```

```text
The page cache hit, which is what actually happens almost every time:

  read() on a cached page:
      ~1 microsecond, entirely CPU and memory
      no disk, no interrupt, no sleep, no context switch

  read() on a miss:
      NVMe   ~100 microseconds       (100x)
      HDD    ~10 milliseconds        (10,000x)

  so an answer that goes straight to the disk has described the
  EXCEPTION. The page cache is why most reads never leave RAM,
  and readahead is why sequential reads usually hit it even the
  first time through a file.
```

```text
The two copies, and the shortcuts that remove them:

  STANDARD read()
     disk --DMA--> page cache --copy_to_user--> user buffer
                       ^                            ^
                   copy 1                        copy 2
                   valuable: serves             pure CPU and memory
                   every later reader           bandwidth, duplicating
                   and every process            bytes already in RAM

  O_DIRECT     disk --DMA--> user buffer
               one copy, but NO caching at all
               -> for databases that manage their own cache

  mmap         page cache pages mapped INTO the address space
               reads touch them directly: NO copy
               -> pays page faults instead

  sendfile     file -> socket, ENTIRELY INSIDE THE KERNEL
  splice       never crosses into user space
               -> how a web server ships a file with zero copies
                  into user memory

  io_uring     removes a different cost: the per-operation syscall,
               via shared submission and completion rings
```

---

### What they ask next

**"What is the common case?"**
A page cache hit. The data is already in RAM, `copy_to_user` runs, and the call returns in about a microsecond with no disk access, no interrupt, no sleep and no context switch. Everything from the block layer onwards is the exception.

**"Why is `fd` an integer rather than a pointer?"**
Because it is an index into a **per-process** table, so it is meaningless outside that process. That indirection is what stops a process naming another's files, and it lets the kernel validate the value cheaply and return `-EBADF` for anything invalid.

**"What does the VFS actually do?"**
It provides one interface over every filesystem and file-like object through a table of function pointers, `f_op`. `vfs_read` calls `f_op->read_iter` without knowing whether it is ext4, NFS, a socket or `/proc`. That single indirection is why the same system call works on all of them.

**"Who copies the data from the disk?"**
Nobody, in the CPU sense. The driver programs the device with physical addresses and the device **DMAs** the data into the page cache pages itself. The CPU only sets up and later completes the transfer, which is why a large read does not consume a core.

**"Why is the process in `D` state and not interruptible?"**
Because `io_schedule()` uses `TASK_UNINTERRUPTIBLE` while a DMA transfer is in flight into kernel-owned pages. Allowing a signal to tear the operation down mid-transfer would leave the device writing into memory the kernel thought it had reclaimed. It is also why a process stuck on a broken disk cannot be killed.

**"Why is the interrupt handler split into two halves?"**
Because the top half runs with interrupts disabled and blocks everything else on that core, so it must be as short as possible. It acknowledges the device and defers the real work to a softirq or threaded handler, which runs with interrupts enabled and can take locks and wake tasks.

**"How many times is the data copied, and can that be reduced?"**
Twice: DMA into the page cache, then `copy_to_user` into the user buffer. `O_DIRECT` removes the first at the cost of caching, `mmap` removes the second by mapping the cached pages, and `sendfile` or `splice` remove both by keeping the data inside the kernel entirely.

**"Where does readahead fit?"**
On a miss the kernel detects sequential access and fetches following pages before they are requested, so subsequent reads hit the cache. It is why reading a large file sequentially is far faster than the per-read latency would suggest.

**The common wrong answer** is "it traps into the kernel, the kernel reads from disk, and returns the data". That skips the three things the question is testing: that the **page cache usually makes the disk irrelevant**, that **DMA means the CPU never touches the bytes**, and that the **process sleeps and the CPU does other work** until an interrupt wakes it.

---

### Say this in the interview

*"The program calls read, which is a glibc wrapper rather than the system call. It puts the syscall number zero in RAX and fd, buf and count in RDI, RSI and RDX, then executes SYSCALL. The CPU switches to ring 0, saves the return address in RCX and flags in R11, and jumps to the address in the LSTAR register. Kernel entry switches to the task's kernel stack, saves the user registers into pt_regs, validates the syscall number against the table bounds and dispatches through sys_call_table to ksys_read. That is a mode switch, not a context switch.*

*Then the descriptor. fd is an integer index into the process's own file descriptor table, which yields a struct file holding the offset f_pos, the flags, and f_op, a table of function pointers. The indirection is the security boundary: the number is meaningless outside that process, and anything out of range or unopened returns minus EBADF.*

*vfs_read does permission and LSM checks and then calls file dash greater than f_op dash greater than read_iter. That one line through a function pointer is the entire purpose of the VFS: the same read works on ext4, XFS, NFS, a pipe, a socket, slash proc, a tty or a device node, because each supplies its own operations table. It is object-oriented dispatch written in C.*

*For a buffered read of a regular file it lands in generic_file_read_iter and filemap_read, which turns f_pos into a page index and looks it up in the inode's address_space, an XArray of cached pages. On a hit the data is already in RAM, so copy_to_user validates the destination and copies, f_pos advances and the call returns. No disk, no interrupt, no sleep, about a microsecond. That is the overwhelmingly common case, and any answer that goes straight to the disk has described the exception. On a miss the kernel allocates a page, inserts it into the cache, triggers readahead for following pages, and continues.*

*ext4 then maps the offset to a device block using its extent tree, giving a logical block address, which is wrapped in a bio describing which pages in memory to fill from which sectors. The bio goes to the block layer, where blk-mq puts it on a per-CPU software queue and then a hardware queue, and an I/O scheduler may merge and reorder, mq-deadline or BFQ on rotational devices and often none on NVMe where the device's own parallelism makes reordering counterproductive.*

*The driver programs the device with the physical addresses of the target pages and rings a doorbell, and then the device DMAs the data straight into those page cache pages. That is the part people miss: the CPU sets up the transfer and is completely uninvolved in moving the bytes, with an IOMMU restricting where the device may write.*

*Meanwhile the kernel calls io_schedule, which puts the task in TASK_UNINTERRUPTIBLE, the D state in ps, and calls schedule. That is the context switch, and the CPU runs something else entirely. Everything before this point was a mode switch within one process.*

*When the transfer completes the device raises an interrupt, normally MSI-X steered to a chosen core. The handler is split because the top half runs with interrupts disabled and blocks that core, so it acknowledges the device and defers; the bottom half, a BLOCK_SOFTIRQ or threaded handler, runs the bio completion, marks the page up to date, unlocks it and wakes the task. The scheduler runs the task again, copy_to_user copies from the page cache into the user buffer, f_pos advances, the byte count goes in RAX, SYSRET returns to ring 3, and glibc turns a small negative value into errno and minus one.*

*The thing I would point out at the end is that the data was written to memory twice: once by DMA into the page cache, and once by copy_to_user into the user buffer. The first is valuable because it serves every later reader, but the second is pure CPU and memory bandwidth duplicating bytes already in RAM. That is why O_DIRECT exists, DMAing straight into the user buffer at the cost of all caching; why mmap exists, mapping the cached pages so there is no copy at all; and why sendfile and splice exist, moving data between descriptors entirely inside the kernel so a web server can ship a file with zero copies into user memory. io_uring attacks a different cost, the per-operation system call, with shared submission and completion rings."*
