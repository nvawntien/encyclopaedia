---
title: "12. Goroutines"
category: "Go"
tags: ["golang", "concurrency", "goroutines", "fundamentals"]
---

# 12. Goroutines: Ultra-lightweight Concurrency

Go was built to conquer the multi-core world. At the heart of this power lies the **Goroutine**. Forget the heavy "Threads" of traditional operating systems; Goroutines are entities thousands of times more efficient.

## 1. What is a Goroutine?

A Goroutine is a function capable of executing concurrently with other functions. A single Go application can run millions of Goroutines simultaneously without overwhelming the system.

> **The main function is a Goroutine:** When a Go program starts, the runtime creates a special Goroutine called the `main goroutine`. If `main` exits, the entire program terminates immediately, regardless of whether other Goroutines are still running.

---

## 2. Basic Mechanics

### 2.1. Initiation with the `go` keyword
Usage is simple: just add the `go` keyword before any function call.

```go
func SayHello(name string) {
    fmt.Println("Hello", name)
}

func main() {
    go SayHello("An") // Executes concurrently in the background
    fmt.Println("The main function continues running...")
    
    // Critical Note: If main exits, background Goroutines are terminated
    time.Sleep(time.Second) 
}
```

### 2.2. Synchronization with WaitGroup
How do we ensure the `main` function patiently waits until all Goroutines have completed their tasks? We use `sync.WaitGroup`.

```go
var wg sync.WaitGroup

wg.Add(1) // Declare 1 pending task
go func() {
    defer wg.Done() // Signal completion when the function returns
    fmt.Println("Processing intensive data...")
}()

wg.Wait() // Blocks until all 'Done' signals are received
fmt.Println("All tasks completed!")
```

### 2.3. Concurrency vs. Parallelism
-   **Concurrency**: The ability to structure and manage multiple tasks to be processed simultaneously (e.g., a chef multi-tasking on one stove).
-   **Parallelism**: Executing multiple tasks at the exact same physical time (e.g., two chefs cooking on two different stoves).

Go is designed for you to write code with a Concurrency mindset, while the Go Runtime automatically distributes these tasks to run in Parallelism across available CPU cores.

> Avoid overusing the `go` keyword indiscriminately. Every Goroutine should have a clear purpose and a strictly managed lifecycle to prevent resource exhaustion.

---

## 3. Why are Goroutines so Powerful? (Architecture & Internals)

The efficiency of Goroutines doesn't come from magic, but from radical optimizations in the Go Runtime's internal architecture (The G-M-P Model).

### 3.1. Comparison: Process vs. OS Thread vs. Goroutine

Compared to traditional OS Threads:
- Tiny stack (starting at a few KB), automatically grows/shrinks flexibly.
- Extremely lightweight Context Switch since it's conducted in user-space (no kernel intervention required).
- Scheduler is fully controlled by the Go runtime instead of the Operating System.

**Benefits:**
- Avoids 1:1 mapping between Goroutines and OS Threads.
- Eliminates the heavy Context Switch overhead of the OS Kernel.
- Maximizes the utilization of multi-core CPUs.

**1. Each Goroutine has its own Stack memory:**
-   **Individual Stack:** Each Goroutine is born with its own dedicated memory area called a Stack (starting at just **2KB**) to store local variables and function calls. This allows them to operate independently without interfering with each other.
-   **Dynamic Scaling (Contiguous Stacks):** If 2KB is insufficient, the Go runtime automatically allocates a larger memory area and moves the data over. Unlike OS Threads, which always hold a fixed 1-8MB (leading to waste), Goroutines use only what they actually need.

**2. Scheduler's Context Switch Mechanism:**
-   A Goroutine is not a real operating system thread; it is a logical entity containing code and its own Stack area.
-   **Execution (Pointer Swap):** When it is a Goroutine's turn to run, the Go Scheduler performs an ultra-fast swap: it updates CPU registers (such as **SP - Stack Pointer** and **PC - Program Counter**) to point directly to the new Goroutine's Stack.
-   **Performance:** Since the Stack memory already exists in memory (Heap), the switch is simply a change in the address the CPU points to. **No stack data is ever copied**, allowing the switch speed to reach nanosecond levels.

#### Comparison Table: Process vs. OS Thread vs. Goroutine

| Metric | Process | OS Thread | Goroutine |
| :--- | :--- | :--- | :--- |
| **Nature** | Resource isolation unit | Execution unit within process | Logic unit in Go |
| **Managed By** | OS Kernel | OS Kernel | Go runtime |
| **Memory Space** | Isolated | Shared | Shared |
| **Heap** | Private | Shared | Shared |
| **Stack** | Private | Private | Private |
| **Stack Size** | Large, fixed | ~1–8 MB, fixed | ~2 KB, dynamic |
| **New Creation** | Very expensive | Expensive | Very cheap |
| **Context Switch** | Very expensive (Kernel) | Expensive (Kernel) | Cheap (User-space) |
| **Scheduling** | Kernel | Kernel | Go scheduler |
| **Max Quantity** | Very few | Several thousand | Hundreds of thousands – millions |
| **Communication** | IPC | Shared memory | Channels / shared memory |
| **Scalability** | Poor | Moderate | Very good |
| **Design Goal** | Safety, isolation | Parallelism | Efficient concurrency |

### 3.2. The G-M-P Scheduler Model

-   **Goroutine**: Consumes only about **2KB** at start and has the ability to grow flexibly (growable stacks).

GMP is the scheduler model of the Go runtime, used to map logical units of work (Goroutines) onto physical execution units (OS Thread/Machine) efficiently. Go uses a highly intelligent internal scheduler. Instead of letting the Operating System manage millions of Threads, the Go Scheduler distributes millions of Goroutines (G) onto a small number of operating system threads (M) via logical processors (P). This ensures that context switching happens extremely fast.

- **G (Goroutine)**: Logical unit of work.
- **M (Machine)**: OS Thread/Physical internal thread.
- **P (Processor)**: Intermediate execution resource, holding the right to run Go code.

#### 3.2.1. G – Goroutine (Unit of Work)

| Criteria | Detailed Description |
| :--- | :--- |
| **Nature** | A logical task, not a Thread. Very lightweight (stack of a few KB, can grow/shrink). Not fixed to an OS Thread. |
| **Role** | Contains: The function to run, Stack, and Metadata (status, pointers, panic info...). |
| **Key Point** | Goroutines do not run on their own. They must be assigned to a P and run on an M. |

#### 3.2.2. M – Machine (OS Thread)

| Criteria | Detailed Description |
| :--- | :--- |
| **Nature** | A real OS Thread created and managed by the Go runtime. |
| **Role** | Actually executes CPU instructions. Runs Go code or is blocked by syscalls. |
| **Key Point** | The number of Ms can be greater than Ps. M does not own the work; it is just the "worker" that executes it. |

#### 3.2.3. P – Processor (Scheduling Core)

| Criteria | Detailed Description |
| :--- | :--- |
| **Nature** | P is not a CPU. P represents: The right to run Go code and comes with a local run queue to hold Goroutines. |
| **Role** | Holds the local Run Queue of Goroutines, Cache allocator, GC state. Coordinates Goroutines very fast without global locks. |
| **Relationship** | 1 P ↔ maximum 1 M at a time. M must have a P to run Go code. |
| **GOMAXPROCS** | Number of Ps is determined by the `GOMAXPROCS` environment variable (defaults to the number of CPU cores). |
| **Local Run Queue** | Each P owns a private queue containing up to **256** Goroutines waiting to run. There is also a special slot called `runnext` to prioritize the Goroutine that just woke up. |

#### 3.2.4. Special Internal Entities

- **M0 (Machine 0)**: The first thread created when the program starts. It is responsible for initializing the runtime and executing the `main` function.
- **G0 (Goroutine 0)**: Every M is accompanied by a G0. G0 does not run user code but runs on the **System Stack** to perform scheduling, memory allocation, and GC management tasks.

### 3.3. Smart Scheduling Mechanisms

#### 3.3.1. Execution Flow

1. Goroutine (G) is created and put into P's Run Queue.
2. A ready OS Thread (M) will grab a Processor (P).
3. M takes a Goroutine (G) from P's Run Queue.
4. M executes that Goroutine.

Goroutine termination states:
- **Finished** → Exit.
- **Blocked** → Detached from M.
- **Voluntary Yield** → Hands CPU back to another Goroutine.

> **Summary:** M runs, P coordinates, G is the work.

#### 3.3.2. Handling Blocking Syscalls

When a Goroutine performs a blocking syscall (e.g., I/O, network), the OS Thread (M) will be blocked along with it. If M holds P, all other Goroutines on that P will stall.

**Go's solution:**
- When a Goroutine enters a blocking syscall: M releases P (allowing the blocked Goroutine to run on M without needing P).
- P is immediately assigned to another idle M.
- **Result:** When the syscall is done, the Goroutine returns to the Run Queue. Other Goroutines on P continue to be scheduled and run without interruption.

#### 3.3.3. Work Stealing (Load Balancing)

- **Problem:** One Processor (P) is idle while another P is overloaded with too many Goroutines in its queue.
- **Solution:** The idle P will "steal" roughly 1/2 of the Goroutines from another P's Run Queue.
- **Benefit:** Avoids total dependence on the Global Queue, reduces lock contention, and optimizes cache locality.

#### 3.3.4. Global Run Queue (GRQ) - Shared Waiting Hall

When P's Local Queue is full (over 256), newly created Goroutines are pushed into the **Global Run Queue**. The GRQ is a shared queue for the entire system, protected by a global lock.

**Retrieval from Global Queue:**
1.  **Fairness (1/61 Rule):** To prevent cases where a P only runs Goroutines in its Local Queue and "starves" Goroutines in the Global Queue, the Go scheduler applies a special rule: Every **61 ticks** (scheduling events), P is forced to check the GRQ before looking at its own Local Queue.
2.  **Batch Picking:** When a P is idle or it's its turn to check the GRQ, it doesn't just take one Goroutine. To optimize and reduce lock contention on the GRQ, P fetches a "batch" of Goroutines.
    *   **Formula:** `n = min(len(GRQ)/Gomaxprocs + 1, 128)`.
    *   These Goroutines are filled into half of the P's Local Queue to be processed sequentially.
3.  **Priority Order:** When a P searches for work (`findrunnable`), the order is usually: Local Queue -> **Global Queue** -> Stealing (from other Ps) -> Network Poller.

#### 3.3.5. Network Poller (Non-blocking I/O)

Go handles millions of network connections without needing millions of OS Threads thanks to the **Network Poller**.

- **Mechanism:** When a Goroutine requests network I/O (read/write socket), it is put into the Network Poller (using OS mechanisms like `epoll`, `kqueue`, or `IOCP`).
- **Benefit:** The OS Thread (M) is not blocked. M can stay free to run other Goroutines. When I/O is ready, the Network Poller notifies the scheduler to put the Goroutine back into a Run Queue.

#### 3.3.6. Scheduler Preemption

Go scheduler is a **Cooperative Scheduler**, meaning Goroutines must manually yield at check points (usually function calls).

- **From Go 1.14 onwards:** Go introduced **Asynchronous Preemption**. If a Goroutine runs for too long (e.g., an infinite loop with no function calls), the runtime sends a signal to force it to stop and make room for others. This keeps the system stable and prevents "greedy" Goroutines from hogging the CPU.

---

## 4. Lifecycle Management & Safety

### 4.1. Goroutine Leaks
A leak occurs when a Goroutine is blocked forever and never exits, causing its stack memory and other resources (file descriptors, locks) to be held indefinitely.

**Common Leak Scenarios:**
- **Sending to an unbuffered channel with no receiver**: The sender blocks forever.
- **Receiving from an empty channel with no sender**: The receiver waits indefinitely.
- **Mutex Deadlocks**: Circular resource dependency preventing G from finishing.
- **I/O without Timeouts**: Network failures or hanging servers blocking the OS Thread (M) and consequently the G.

**Prevention Best Practices:**
- Always use `select` statements with `context.Done()` to provide an exit path.
- Implement `context.WithTimeout` or `context.WithCancel` for all I/O and network operations.
- Ensure only one Goroutine (the Sender) is responsible for `close()`ing a channel.

### 4.2. Panic and Recover Rules
**A panic in any Goroutine will crash the entire program**, even if `main` has a `recover()`.
- **Rule**: Every Goroutine must manage its own `recover()` internally.

```go
go func() {
    defer func() {
        if r := recover(); r != nil {
            log.Printf("Recovered from panic in goroutine: %v", r)
        }
    }()
    // Core logic
    doWork()
}()
```

---

## 5. Observability Tools

### 5.1. Monitoring with GODEBUG
Run your application with the environment variable:
`GODEBUG=schedtrace=1000 ./app`
- This provides visual insight into G-M-P distribution every 1000ms, helping detect resource starvation or excessive OS thread creation.

### 5.2. Useful Runtime Functions
- `runtime.NumGoroutine()`: Returns the number of currently living Goroutines (essential for debugging leaks).
- `runtime.Gosched()`: Voluntarily yields the CPU.
- `runtime.GOMAXPROCS(n)`: Adjusts the number of logical processors.

---
