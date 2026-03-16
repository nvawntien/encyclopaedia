---
title: "07. Maps"
category: "Go"
tags: ["golang", "maps", "fundamentals"]
---

# 07. Maps

**Map** là một cấu trúc dữ liệu lưu trữ dưới dạng cặp **Key-Value**, được hiện thực hóa dựa trên cơ chế **Hash Table**. Đặc điểm nổi bật nhất của Map là khả năng truy xuất, thêm và xóa phần tử với độ phức tạp trung bình là $O(1)$.

---

## 1. Khởi tạo và Thao tác

Trong Go, Map là một kiểu dữ liệu tham chiếu (**Reference Type**). Bạn có thể khởi tạo Map bằng hai cách:

```go
// Khởi tạo thông qua Map Literal
langs := map[string]string{
    "Go":   "Google",
    "Rust": "Mozilla",
}

// Khởi tạo bằng hàm make (Xác định trước sức chứa để tối ưu hiệu năng)
scores := make(map[string]int, 100)

scores["An"] = 10     // Assign
delete(scores, "An")  // Delete
```

### Kiểm tra sự hiện diện (Lookup Check)
Vì Map sẽ trả về **Zero Value** khi truy cập vào Khóa không tồn tại, cú pháp sau được sử dụng để xác định trạng thái thực tế của phần tử:

```go
val, ok := langs["Java"]
if ok {
    fmt.Println("Tìm thấy:", val)
}
```

---

## 2. Cấu trúc bên trong

Để đạt được hiệu năng cao, Map trong Go (định nghĩa tại `runtime/map.go`) được cấu tạo từ những thành phần phức tạp bên dưới lớp vỏ cú pháp.

### 2.1. hmap & bmap (Buckets)
Cấu trúc cốt lõi của Map là `hmap`, quản lý toàn bộ siêu dữ liệu của bảng băm. Dữ liệu thực tế được lưu trữ trong các **Buckets** (`bmap`).

```go
// Simplified from runtime/map.go
type hmap struct {
    count     int    // Số lượng phần tử hiện có
    B         uint8  // log2 của số lượng Buckets (sức chứa = 2^B)
    hash0     uint32 // Seed ngẫu nhiên để chống Hash Collision DoS
    buckets   unsafe.Pointer // Con trỏ trỏ tới mảng các Buckets hiện tại
    oldbuckets unsafe.Pointer // Con trỏ trỏ tới mảng Buckets cũ khi đang Grow
}

type bmap struct {
    tophash [8]uint8 // Lưu 8 bit cao của mã băm để so khớp nhanh
    // (Dữ liệu bên dưới được trình thông dịch Go sắp xếp ngầm):
    // keys     [8]keytype
    // values   [8]valuetype
    // overflow *bmap (Con trỏ trỏ tới bucket tràn nếu cần)
}
```

**Lưu ý về bộ nhớ:** Go không sắp xếp theo kiểu `[key1, value1, key2, value2...]`. Thay vào đó, nó gom toàn bộ `keys` nằm cạnh nhau, sau đó mới tới toàn bộ `values` nằm cạnh nhau. Cách thiết kế này giúp tối ưu hóa **Padding** (phần đệm bộ nhớ), giảm thiểu lãng phí RAM khi kích thước Key và Value khác biệt đáng kể.

### 2.2. Cơ chế Hashing & Tophash
Khi một Khóa được đưa vào, Go thực hiện các bước:
1. **Hashing**: Sử dụng mã băm được sinh ra kết hợp với `hash0` để tạo ra chuỗi định danh duy nhất.
2. **Bucket Selection**: Các bit thấp của mã băm quyết định Khóa sẽ nằm ở Bucket nào.
3. **Tophash**: 8 bit cao của mã băm được lưu vào mảng `tophash`. Khi truy vấn, Go chỉ so sánh các bit cao này trước. Nếu khớp, nó mới thực hiện so sánh toàn bộ Khóa trong bộ nhớ. Việc này giúp tăng tốc độ tìm kiếm vượt trội.

### 2.3. Evacuation & Incremental Growth
Go quản lý hiệu năng thông qua **Load Factor** (tỷ lệ trung bình giữa số phần tử và số Bucket). Khi Load Factor vượt ngưỡng **6.5**:
- Go sẽ kích hoạt quá trình mở rộng (Grow).
- Một mảng Bucket mới có kích thước gấp đôi sẽ được tạo ra.
- **Incremental Evacuation**: Thay vì di chuyển toàn bộ dữ liệu cùng lúc gây treo hệ thống (**Stop The World**), Go sẽ di chuyển dữ liệu cũ sang mới một cách rải rác mỗi khi người dùng thực hiện thao tác ghi hoặc xóa.

---

## 3. Cơ chế vận hành chuyên sâu

### 3.1. Tính ngẫu nhiên khi Iteration
Lập trình viên Go tuyệt đối không được dựa vào thứ tự khi dùng `range` trên Map. 
*   **Bản chất**: Trong mỗi vòng lặp `range`, runtime của Go chọn một **Seed ngẫu nhiên** để quyết định bắt đầu ở một Bucket bất kỳ và một vị trí (offset) bất kỳ trong Bucket đó.
*   **Lý do**: Go muốn đảm bảo mã nguồn của bạn không bị phụ thuộc vào thứ tự ngẫu nhiên của bảng băm (vốn sẽ thay đổi sau khi map bị mở rộng).

### 3.2. Same-size Grow (Tái cấu trúc cùng kích thước)
Ngoài việc gấp đôi bộ nhớ khi quá tải ($LF > 6.5$), Go còn thực hiện Grow cùng kích thước nếu số lượng **Overflow Buckets** quá lớn nhưng Load Factor vẫn thấp. 
*   **Mục đích**: Chống lại tình trạng bản đồ bị "rỗng" (do thêm và xóa quá nhiều). Go sẽ gom các phần tử lại cho khít nhau, xóa bỏ các xô tràn dư thừa để duy trì hiệu năng $O(1)$.

### 3.3. Cạm bẫy với Khóa NaN (float64)
Trong Go, `float64` có thể dùng làm Khóa, nhưng giá trị `math.NaN()` cực kỳ nguy hiểm. Theo chuẩn IEEE 754, `NaN != NaN`.
*   **Hệ quả**: Nếu bạn chèn một phần tử với Key là `NaN`, bạn sẽ **không bao giờ** lấy nó ra được bằng Lookup (vì `NaN` đưa vào không bao giờ bằng `NaN` khi tìm kiếm). Nó trở thành "rác" vĩnh viễn trong map.

### 3.4. Pattern: Set Implementations
Go không có kiểu dữ liệu `Set` dựng sẵn. Cách tối ưu nhất để hiện thực hóa Set là dùng Map với `struct{}`:
```go
set := make(map[string]struct{})
set["item1"] = struct{}{}
```
*   **Tại sao dùng `struct{}`?**: `struct{}` chiếm **0 byte** bộ nhớ. Nếu dùng `bool`, bạn sẽ mất thêm 1 byte cho mỗi phần tử. Đây là kỹ thuật tiết kiệm tài nguyên tối đa cho các tập hợp dữ liệu lớn.

---

## 4. Các lưu ý quan trọng

### An toàn luồng (Concurrency)
Map trong Go **không mặc định an toàn** khi truy cập đồng thời. Nếu thực hiện thao tác ghi song song mà không có cơ chế bảo vệ, chương trình sẽ xảy ra lỗi **Runtime Panic**.
- Sử dụng `sync.RWMutex` để điều phối truy cập.
- Hoặc sử dụng `sync.Map` cho các trường hợp đặc thù (Key ít thay đổi nhưng tần suất đọc cực cao).

### Giải phóng bộ nhớ (Memory Persistence)
Map **không tự thu hồi** bộ nhớ của các Bucket sau khi phần tử bị xóa bằng `delete`. 
- Để giải phóng hoàn toàn, bạn cần gán `map = nil` hoặc khởi tạo lại Map mới để kích hoạt **Garbage Collection**.

### Điều kiện của Khóa (Comparable Keys)
Khóa của Map phải là kiểu dữ liệu có thể so sánh được (`comparable`). Do đó, **Slices**, **Maps**, và **Functions** không thể làm Khóa vì chúng không hỗ trợ phép so sánh `==`.
