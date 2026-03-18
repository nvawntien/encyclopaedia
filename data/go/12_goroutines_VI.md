---
title: "12. Goroutines"
category: "Go"
tags: ["golang", "concurrency", "goroutines", "fundamentals"]
---

# 12. Goroutines: Lập trình đồng thời siêu nhẹ

Go được khai sinh để chinh phục thế giới đa nhân (Multi-core). Trái tim của sức mạnh này chính là **Goroutine**. Hãy tạm quên đi khái niệm "Thread" (Luồng) nặng nề của hệ điều hành; Goroutine là một thực thể vận hành nhẹ nhàng hơn hàng nghìn lần.

## 1. Goroutine là gì?

Goroutine là một hàm có khả năng thực thi đồng thời với các hàm khác. Một ứng dụng Go có thể vận hành hàng triệu Goroutine cùng một lúc mà không làm quá tải hệ thống.

## 2. Cách vận hành cơ bản

### 2.1. Khởi tạo với từ khóa `go`

Mọi thứ diễn ra vô cùng đơn giản: chỉ cần thêm từ khóa `go` trước bất kỳ lời gọi hàm nào.

```go
func SayHello(name string) {
    fmt.Println("Xin chào", name)
}

func main() {
    go SayHello("An") // Thực thi hàm ngầm trong nền (background)
    fmt.Println("Hàm main vẫn tiếp tục chạy...")

    // Lưu ý quan trọng: Nếu hàm main kết thúc, mọi Goroutine khác cũng sẽ bị ngắt lập tức
    time.Sleep(time.Second)
}
```

> **Hàm main là một Goroutine:** Khi chương trình Go chạy, hệ thống sẽ tạo ra một Goroutine đặc biệt gọi là `main goroutine`. Nếu `main` thoát ra, chương trình sẽ đóng lại ngay lập tức mà không cần quan tâm các Goroutine khác có còn đang chạy hay không.

### 2.2. Đồng bộ hóa với WaitGroup

Làm thế nào để hàm `main` kiên nhẫn chờ đợi cho đến khi tất cả các Goroutine hoàn thành nhiệm vụ? Chúng ta sử dụng công cụ `sync.WaitGroup`.

```go
var wg sync.WaitGroup

wg.Add(1) // Thông báo có 1 tác vụ chuẩn bị bắt đầu
go func() {
    defer wg.Done() // Báo cáo hoàn thành khi hàm kết thúc
    fmt.Println("Đang xử lý dữ liệu chuyên sâu...")
}()

wg.Wait() // Dừng lại chờ cho đến khi nhận được đủ tín hiệu Done
fmt.Println("Mọi tác vụ đã hoàn tất!")
```

### 2.3. Phân biệt Concurrency và Parallelism

-   **Concurrency (Đồng thời)**: Khả năng sắp xếp và quản lý nhiều việc để xử lý cùng lúc (ví dụ: một người vừa nấu ăn vừa nghe điện thoại).
-   **Parallelism (Song song)**: Thực hiện nhiều việc tại cùng một thời điểm vật lý (ví dụ: hai đầu bếp cùng nấu ăn ở hai gian bếp khác nhau).

Go được thiết kế tối ưu để bạn viết mã theo tư duy Concurrency, và hệ thống của Go (Go Runtime) sẽ tự động phân phối để chúng chạy Parallelism trên các nhân CPU hiện có.

> Đừng lạm dụng từ khóa `go` một cách vô tội vạ. Mỗi Goroutine cần có mục tiêu rõ ràng và phải được quản lý vòng đời chặt chẽ để tránh rò rỉ tài nguyên.

---

## 3. Tại sao Goroutine mạnh mẽ? (Kiến trúc & Cơ chế)

### 3.1. So sánh với Thread truyền thống

So với OS Thread truyền thống:
- Stack cực nhỏ (khởi điểm vài KB), tự động co/giãn linh hoạt.
- Context Switch (chuyển đổi ngữ cảnh) cực nhẹ do được tiến hành ở user-space (không cần can thiệp xuống kernel).
- Scheduler được kiểm soát hoàn toàn bởi Go runtime thay vì Hệ điều hành.

**Lợi ích:**
- Tránh ánh xạ 1:1 giữa Goroutine và OS Thread.
- Loại bỏ chi phí Context Switch nặng nề của OS Kernel.
- Tận dụng tối đa sức mạnh đa nhân (Core CPU).

**1. Mỗi Goroutine có bộ nhớ Stack riêng biệt:**
-   **Stack riêng:** Mỗi Goroutine khi sinh ra đều được cấp một vùng nhớ riêng gọi là Stack (khởi điểm chỉ **2KB**) để lưu trữ các biến cục bộ và lời gọi hàm. Điều này giúp chúng hoạt động độc lập, không xâm phạm lẫn nhau.
-   **Tự động co giãn (Contiguous Stacks):** Nếu 2KB không đủ, Go runtime sẽ tự động cấp thêm vùng nhớ lớn hơn và chuyển dữ liệu sang. Khác với OS Thread luôn giữ cố định 1-8MB (gây lãng phí), Goroutine chỉ dùng đúng những gì nó cần.

**2. Cơ chế Hoán đổi (Context Switch) của Scheduler:**
-   Goroutine không phải là một luồng hệ điều hành thật sự, nó là một thực thể logic chứa code và vùng nhớ Stack riêng.
-   **Cách chạy (Pointer Swap):** Khi đến lượt một Goroutine được chạy, Go Scheduler thực hiện việc hoán đổi cực nhanh: nó cập nhật các thanh ghi của CPU (như **SP - Stack Pointer** và **PC - Program Counter**) để trỏ thẳng vào vùng Stack của Goroutine mới.
-   **Hiệu năng:** Vì vùng nhớ Stack đã nằm sẵn trên bộ nhớ (Heap), việc chuyển đổi chỉ là thay đổi địa chỉ mà CPU trỏ tới. **Hoàn toàn không có việc sao chép dữ liệu Stack**, giúp tốc độ chuyển đổi đạt mức nano giây.

#### Bảng so sánh Process vs Thread vs Goroutine

| Tiêu chí | Process | Thread (OS) | Goroutine (Go) |
| :--- | :--- | :--- | :--- |
| **Bản chất** | Đơn vị cô lập tài nguyên | Đơn vị thực thi trong process | Đơn vị thực thi logic của Go |
| **Quản lý bởi** | Hệ điều hành | Hệ điều hành | Go runtime |
| **Không gian bộ nhớ** | Riêng biệt | Chung trong process | Chung trong process |
| **Heap** | Riêng | Chung | Chung |
| **Stack** | Riêng | Riêng | Riêng |
| **Kích thước stack** | Lớn, cố định | ~1–8 MB, cố định | ~2 KB, tăng động |
| **Tạo mới** | Rất tốn kém | Tốn kém | Rất rẻ |
| **Context switch** | Rất đắt (kernel) | Đắt (kernel) | Rẻ (user-space) |
| **Scheduling** | Kernel | Kernel | Go scheduler |
| **Số lượng tối đa** | Rất ít | Vài nghìn | Hàng trăm nghìn – triệu |
| **Giao tiếp** | IPC | Shared memory | Channel / shared memory |
| **Khả năng scale** | Kém | Trung bình | Rất tốt |
| **Mục tiêu thiết kế** | An toàn, cách ly | Song song | Concurrency hiệu quả |

### 3.2. Mô hình lập lịch GMP

-   **Goroutine**: Chỉ tiêu tốn khoảng **2KB** khởi điểm và có khả năng co giãn linh hoạt (growable stacks).

GMP là mô hình lập lịch (scheduler) của Go runtime, được sử dụng để ánh xạ các đơn vị công việc logic (Goroutine) lên các đơn vị thực thi vật lý (OS Thread/Machine) một cách hiệu quả. Go sử dụng một bộ điều phối (scheduler) nội bộ vô cùng thông minh. Thay vì để Hệ điều hành quản lý hàng triệu Thread, Go Scheduler sẽ tự mình phân phối hàng triệu Goroutine (G) lên một số lượng ít các Thread hệ điều hành (M) thông qua các bộ xử lý logic (P). Điều này giúp việc chuyển đổi ngữ cảnh (context switch) diễn ra cực nhanh.

- **G (Goroutine)**: Đơn vị công việc logic.
- **M (Machine)**: OS Thread/Luồng Hệ điều hành vật lý.
- **P (Processor)**: Tài nguyên thực thi trung gian, giữ quyền chạy Go code.

#### 3.2.1. G – Goroutine (Đơn vị công việc)

| Tiêu chí | Mô tả chi tiết |
| :--- | :--- |
| **Bản chất** | Là một task logic, không phải Thread. Rất nhẹ (stack vài KB, có thể tự co/giãn). Không gắn cố định với OS Thread. |
| **Vai trò** | Chứa: Function cần chạy, Stack, và các Metadata (status, con trỏ, thông tin panic...). |
| **Điểm quan trọng** | Goroutine không tự chạy. Nó bắt buộc phải được gán cho P và chạy trên M. |

#### 3.2.2. M – Machine (OS Thread)

| Tiêu chí | Mô tả chi tiết |
| :--- | :--- |
| **Bản chất** | Là một OS Thread thật do Go runtime tạo và quản lý. |
| **Vai trò** | Thực sự thực thi các lệnh CPU (CPU instruction). Chạy Go code hoặc bị block bởi syscall (hệ thống). |
| **Điểm quan trọng** | Số lượng M có thể nhiều hơn P. M không sở hữu công việc, nó chỉ là "người làm thuê" để thực thi. |

#### 3.2.3. P – Processor (Lõi Lập lịch)

| Tiêu chí | Mô tả chi tiết |
| :--- | :--- |
| **Bản chất** | P không phải CPU. P là: Quyền được chạy Go code và đi kèm với hàng đợi (run queue) local để chứa Goroutine. |
| **Vai trò** | Giữ Run queue của Goroutine, Cache allocator, GC state. Điều phối Goroutine rất nhanh mà không cần khóa (lock) toàn cục. |
| **Quan hệ** | 1 P ↔ tối đa 1 M tại một thời điểm. M muốn chạy Go code bắt buộc phải có P. |
| **GOMAXPROCS** | Số lượng P được xác định bởi biến môi trường `GOMAXPROCS` (thường mặc định bằng số core CPU). |
| **Local Run Queue** | Mỗi P sở hữu một hàng đợi riêng chứa tối đa **256** Goroutine đang chờ chạy. Ngoài ra còn có một slot đặc biệt gọi là `runnext` để ưu tiên chạy ngay lập tức Goroutine vừa thức tỉnh. |

#### 3.2.4. Các thực thể nội bộ đặc biệt

- **M0 (Machine 0)**: Là thread đầu tiên được tạo ra khi chương trình khởi chạy. Nó chịu trách nhiệm khởi tạo runtime và thực thi hàm `main`.
- **G0 (Goroutine 0)**: Mỗi M đều đi kèm với một G0. G0 không chạy code người dùng mà chạy trên **System Stack** để thực hiện các nhiệm vụ lập lịch, cấp phát bộ nhớ và quản lý GC.

### 3.3. Cơ chế lập lịch thông minh

#### 3.3.1. Luồng chạy thực tế (Execution Flow)

1. Goroutine (G) được tạo và đưa vào Run Queue của P.
2. Một OS Thread (M) sẵn sàng sẽ lấy một Processor (P).
3. M lấy một Goroutine (G) từ Run Queue của P.
4. M thực thi Goroutine đó.

Trạng thái kết thúc của Goroutine:
- **Chạy xong** → Exit.
- **Bị block** → Bị tách khỏi M.
- **Tự nguyện nhả CPU (Yield)** → Trả CPU cho Goroutine khác.

> **Tóm tắt:** M chạy, P điều phối, G là công việc.

#### 3.3.2. Xử lý Blocking Syscall

Khi một Goroutine thực hiện một lệnh Syscall blocking (như I/O, network), OS Thread (M) sẽ bị block theo. Nếu M giữ P, toàn bộ Goroutine trên P đó sẽ bị đứng.

**Giải pháp của Go:**
- Khi Goroutine vào Syscall blocking: M nhả P (cho phép Goroutine bị block chạy trên M mà không cần P).
- P ngay lập tức được gán cho một M khác rảnh rỗi.
- **Kết quả:** Khi Syscall xong, Goroutine quay lại Run Queue. Các Goroutine khác trên P vẫn tiếp tục được lập lịch và chạy mà không bị gián đoạn.

#### 3.3.3. Work Stealing (Cân bằng tải)

- **Vấn đề:** Một Processor (P) rảnh rỗi nhưng P khác lại quá tải với quá nhiều Goroutine trong hàng đợi.
- **Giải pháp:** P rảnh sẽ "ăn cắp" (steal) khoảng 1/2 số Goroutine từ Run Queue của P khác.
- **Lợi ích:** Tránh phụ thuộc hoàn toàn vào Global Queue, giảm xung đột khóa (lock contention), và tối ưu cache locality.

#### 3.3.4. Global Run Queue (GRQ) - Hành lang chờ chung

Khi Local Queue của P bị đầy (quá 256), các Goroutine mới sinh ra sẽ được đẩy vào **Global Run Queue**. GRQ là một hàng đợi dùng chung cho toàn bộ hệ thống, được bảo vệ bởi một khóa (global lock).

**Cơ chế thoát khỏi Global Queue:**
1.  **Tính công bằng (Quy tắc 1/61):** Để tránh việc P chỉ mải mê chạy các Goroutine trong Local Queue mà "bỏ đói" (starve) các Goroutine ở Global Queue, Go scheduler áp dụng quy tắc đặc biệt: Cứ mỗi **61 ticks** (lần lập lịch), P sẽ bắt buộc phải kiểm tra GRQ trước khi xem Local Queue của chính mình.
2.  **Lấp đầy mẻ (Batch Picking):** Khi một P rảnh rỗi hoặc đến lượt kiểm tra GRQ, nó không chỉ lấy duy nhất 1 Goroutine. Để tối ưu hóa và giảm số lần phải tranh chấp khóa (lock contention) trên GRQ, P sẽ lấy một "mẻ" (batch) Goroutine.
    *   **Công thức:** `n = min(len(GRQ)/Gomaxprocs + 1, 128)`.
    *   Các Goroutine này sẽ được nạp đầy vào 1/2 Local Queue của P đó để xử lý dần.
3.  **Thứ tự ưu tiên:** Khi P đi tìm việc (`findrunnable`), thứ tự thường là: Local Queue -> **Global Queue** -> Stealing (ăn cắp từ P khác) -> Network Poller.

#### 3.3.5. Network Poller (Non-blocking I/O)

Go xử lý hàng triệu kết nối mạng mà không cần hàng triệu OS Thread nhờ **Network Poller**.

- **Cơ chế:** Khi một Goroutine yêu cầu I/O mạng (read/write socket), nó sẽ được đưa vào Network Poller (sử dụng các cơ chế OS như `epoll`, `kqueue`, hoặc `IOCP`).
- **Lợi ích:** OS Thread (M) không bị block. M có thể rảnh tay để chạy Goroutine khác. Khi I/O sẵn sàng, Network Poller sẽ thông báo cho scheduler để đưa Goroutine đó quay lại Run Queue.

#### 3.3.6. Scheduler Preemption (Cơ chế chiếm quyền)

Go scheduler là một **Cooperative Scheduler** (hợp tác), nghĩa là Goroutine phải tự nhường (yield) tại các điểm kiểm tra (thường là lời gọi hàm).

- **Từ Go 1.14 trở đi:** Go giới thiệu **Asynchronous Preemption**. Nếu một Goroutine chạy quá lâu (ví dụ vòng lặp vô tận không có lời gọi hàm), runtime sẽ gửi một tín hiệu (Signal) để ép Goroutine đó dừng lại và nhường chỗ cho người khác. Điều này giúp hệ thống ổn định hơn, tránh việc một Goroutine "tham lam" chiếm dụng toàn bộ CPU.

## 4. Quản trị vòng đời & An toàn

### 4.1. Goroutine Leaks

**Goroutine leak** xảy ra khi một Goroutine bị treo (block) vĩnh viễn và không bao giờ thoát khỏi chương trình. Sự cố này khiến bộ nhớ stack của Goroutine đó và các tài nguyên nó đang nắm giữ (như file descriptors, locks) không bao giờ được giải phóng, dẫn đến lãng phí bộ nhớ và CPU, làm hệ thống cạn kiệt tài nguyên theo thời gian.

#### 4.1.1. Các kịch bản gây Leak phổ biến

- **1. Gửi dữ liệu vào Channel mà không có ai nhận**: 
  - **Bị Block như nào**: Khi một Goroutine gửi dữ liệu (`ch <- data`) vào một unbuffered channel nhưng không có Goroutine nào sẵn sàng nhận ở đầu kia.
  - **Vì sao Leak**: Nếu Goroutine nhận bị thoát trước hoặc không bao giờ được tạo ra, Goroutine gửi sẽ bị treo vĩnh viễn tại dòng lệnh gửi.

- **2. Nhận từ Channel mà không có ai gửi**: 
  - **Bị Block như nào**: Khi Goroutine cố gắng nhận dữ liệu (`<-ch`) từ một channel rỗng (kể cả buffered channel đã cạn) và không còn Goroutine nào gửi dữ liệu vào đó.
  - **Vì sao Leak**: Nếu Goroutine gửi bị lỗi (crash) hoặc thoát sớm, Goroutine nhận sẽ chờ vô thời hạn.

- **3. Deadlock do Mutex**: 
  - **Bị Block như nào**: Goroutine cố lấy một Lock (`mutex.Lock()`) nhưng Lock đó lại đang bị giữ bởi chính nó hoặc bởi một Goroutine khác tạo ra vòng lặp chờ tài nguyên (deadlock chu kỳ).
  - **Vì sao Leak**: Goroutine treo vĩnh viễn chờ đợi Lock không bao giờ được nhả.

- **4. Chờ I/O hoặc System Call không thiết lập Timeout**: 
  - **Bị Block như nào**: Goroutine thực hiện I/O (gọi API mạng, đọc file, kết nối DB) mà không có thời gian chờ (timeout).
  - **Vì sao Leak**: Nếu mất mạng hoặc server đích sập, OS Thread (M) sẽ block vô thời hạn kéo theo Goroutine bị leak.

#### 4.1.2. Giải pháp ngăn chặn Goroutine Leak (Best Practices)

Để ngăn chặn, cần đảm bảo mọi Goroutine có một cơ chế thoát được kiểm soát chặt chẽ:

1.  **Sử dụng `select` cho Channel và Context**: Luôn dùng khối `select` để kết hợp gửi/nhận channel với việc mở lối thoát thông qua tín hiệu hủy bỏ (`channel done` hoặc `context.Done()`).
2.  **Dùng `context.Context` cho Timeout/Hủy bỏ**:
    - Sử dụng `context.WithCancel` hoặc `context.WithTimeout` và truyền context này vào các hàm I/O/Network để giới hạn thời gian thực thi.
    - Goroutine phải chủ động kiểm tra `ctx.Done()` và return ngay lập tức.
3.  **Đóng Channel (`close`) Có Trách Nhiệm**: Chỉ một Goroutine duy nhất (thường là Goroutine gửi tiến trình) được phép `close` channel. Đóng channel đúng lúc giúp đánh thức các vòng lặp `range` ở đầu nhận.
4.  **Sử dụng Buffered Channel có cân nhắc**: Giúp Goroutine gửi giảm tình trạng bị đứng tức khắc. Tuy nhiên, nếu buffer bị đầy mà đầu kia không ai xử lý, tình trạng block và leak vẫn sẽ diễn ra.

### 4.2. Panic và Recover trong Goroutine (Quy tắc an toàn)

Một sai lầm nguy hiểm của lập trình viên Go mới là quên rằng **Panic trong một Goroutine sẽ làm sập toàn bộ chương trình**, ngay cả khi `main goroutine` có lệnh `recover()`.

- **Nguyên tắc:** Mỗi Goroutine phải tự quản lý `recover()` của chính nó.
- **Cách xử lý chuẩn:**
```go
go func() {
    defer func() {
        if r := recover(); r != nil {
            log.Printf("Recovered from panic in goroutine: %v", r)
        }
    }()
    // Code thực thi chính của Goroutine
    doWork()
}()
```

## 5. Công cụ giám sát và quan sát (Observability)

### 5.1. Theo dõi Scheduler với GODEBUG

Bạn có thể xem trực quan cách các G-M-P đang làm việc bằng cách chạy chương trình với biến môi trường:
`GODEBUG=schedtrace=1000 ./myprog`
- `schedtrace=1000`: In trạng thái scheduler mỗi 1000ms.
- Giúp bạn phát hiện các hiện tượng như "P bị đói" hoặc "quá nhiều OS Threads bị tạo ra".

### 5.2. Các hàm Runtime hữu ích

- `runtime.NumGoroutine()`: Trả về số lượng Goroutine hiện có. Cực kỳ quan trọng để debug Goroutine leak.
- `runtime.Gosched()`: Chủ động nhường CPU cho Goroutine khác.
- `runtime.GOMAXPROCS(n)`: Giới hạn số nhân CPU mà Go runtime được sử dụng.

---
