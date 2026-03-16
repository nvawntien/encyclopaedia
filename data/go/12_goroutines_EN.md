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

| Metric | Process | OS Thread | Goroutine |
| :--- | :--- | :--- | :--- |
| **Nature** | Resource isolation unit | Execution unit within process | Logic execution unit in Go |
| **Managed By** | OS Kernel | OS Kernel | **Go Runtime** |
| **Memory Space** | Isolated | Shared within process | Shared within process |
| **Stack Size** | Large, fixed | ~1–8 MB, fixed | **~2 KB, dynamic (growable)** |
| **Creation Cost** | Very expensive | Expensive | **Ultralight / Cheap** |
| **Context Switch** | Very slow (Kernel-space) | Slow (Kernel-space) | **Extremely fast (User-space)** |
| **Max Quantity** | Very few | Several thousand | **Millions** |
| **Communication** | IPC | Shared memory | **Channels / Shared memory** |
| **Scalability** | Poor | Moderate | **Excellent** |

### 3.2. The G-M-P Scheduler Model
G-M-P is the internal architecture used to map millions of logical Goroutines onto a small number of physical OS Threads.

- **G (Goroutine)**: The unit of logic. Contains the function, stack (~2KB), and metadata (status, panic info, etc.).
- **M (Machine)**: A physical OS Thread that executes CPU instructions. M is the "worker".
- **P (Processor)**: An abstract execution resource. M must hold a P to execute G code.
- **GOMAXPROCS**: The number of available Ps (defaults to the number of CPU cores).

**Special Internal Entities:**
- **Local Run Queue**: Each P maintains a queue of up to **256 Gs**. It also features a `runnext` slot for the highest priority Goroutine (e.g., one that just woke up).
- **M0 (Machine 0)**: The first thread created to initialize the runtime and run `main`.
- **G0 (Goroutine 0)**: Every M has a G0 that runs on the **System Stack** to handle scheduling, memory allocation, and GC tasks.

### 3.3. Senior-Level Scheduling Mechanisms

#### 1. Execution Flow & Work Stealing
- Gs are placed into P's Local Queue. An available M grabs a P and executes Gs from its queue.
- **Work Stealing**: If a P runs out of work, it will "steal" roughly 50% of the Gs from another P's Local Queue or fetch from the **Global Run Queue**. (The scheduler checks the Global Queue every 1/61 ticks to prevent G starvation).

#### 2. Handling Blocking Syscalls
When a G performs a blocking syscall:
- M immediately releases P so that another available M can take over P and continue executing other Gs.
- Once the syscall completes, the original G attempts to re-acquire a P (or is moved to the Global Queue).

#### 3. Network Poller (Non-blocking I/O)
Go handles millions of network connections efficiently via the **Network Poller**:
- When a G requests I/O (e.g., socket read/write), it doesn't block M. Instead, it is moved to the Network Poller (utilizing OS primitives like `epoll/kqueue/IOCP`).
- M remains free to run other Gs. Once I/O is ready, the Network Poller notifies the scheduler to move G back to a Run Queue.

#### 4. Scheduler Preemption
- **Before Go 1.14**: Cooperative scheduling. A G had to manually yield or perform a function call to be descheduled.
- **Go 1.14+**: **Asynchronous Preemption**. The runtime sends signals to forcibly preempt Gs that run for too long (e.g., tight loops), ensuring fairness and system stability.

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
