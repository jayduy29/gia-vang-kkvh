# Web app tra cứu giá vàng — Kim Khánh Việt Hùng

Tra cứu giá vàng tại <https://kimkhanhviethung.vn/tra-cuu-gia-vang.html>:
bảng giá hiện tại, biểu đồ theo thời gian, thống kê, và **dữ liệu tự động cập nhật mỗi ngày**.

- **Repo:** https://github.com/jayduy29/gia-vang-kkvh
- **Web (GitHub Pages):** https://jayduy29.github.io/gia-vang-kkvh/

## Dữ liệu cập nhật mỗi ngày được lưu ở đâu?

**Lưu tại `data/gold.json` trong repo GitHub** — đây là "nguồn sự thật" (single source of truth):

```
data/gold.json
{
  "site": "...", "unit": "Đồng/chỉ", "generatedAt": "...", "days": 128,
  "snapshots": {
    "2026-10-09": { "sourceUpdatedAt": "09/10/2026 14:16:19", "origin": "live",
                    "items": [ {group, name, buy, sell, convert}, ... ] },
    ...
  }
}
```

| Thành phần | Vai trò |
|---|---|
| `data/gold.json` | Dữ liệu **chung** — GitHub Action ghi mỗi ngày, web đọc từ đây, ai mở cũng thấy giống nhau. |
| Git history | Mỗi lần Action commit là 1 version của file → **lịch sử versions tự lưu**, xem lại được (`git log -p data/gold.json`). |
| localStorage (trình duyệt) | **Bản ghi cục bộ**: kết quả nút "Cập nhật ngay", backfill Wayback trên máy bạn — được gộp vào dữ liệu chung khi mở trang. |

GitHub Pages phục vụ thẳng repo → web đọc được `data/gold.json` tại
`https://jayduy29.github.io/gia-vang-kkvh/data/gold.json`.

## Tự động cập nhật mỗi ngày

Workflow **`.github/workflows/daily-gold.yml`**:

| Kích hoạt | Thời gian | Việc làm |
|---|---|---|
| `schedule` (cron) | **07:00 UTC = 14:00 giờ VN mỗi ngày** | `node scripts/fetch-gold.mjs` → scrape bảng giá → merge → commit `data/gold.json` |
| `workflow_dispatch` (chạy tay) | Khi bạn bấm nút Run | Tùy chọn `backfill=true` để tải thêm lịch sử 1 năm từ Wayback |

Xem/chạy: repo → tab **Actions** → *Cập nhật giá vàng hằng ngày* → **Run workflow**.

Muốn đổi giờ: sửa cron trong file workflow (ví dụ `'30 6 * * *'` = 13:30 VN).
Lưu ý GitHub cron có thể trễ vài phút.

Script **không cần thư viện ngoài** (dùng `fetch` của Node 18+, parse bằng regex không đổi
cấu trúc trang). Thoát mã khác 0 khi lỗi → Action hiện đỏ để bạn biết site đổi cấu trúc.

## Chạy local (không cần GitHub)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1
# → http://localhost:8787/
```

Chạy script thu thập như GitHub Action (cần Node 18+):

```bash
node scripts/fetch-gold.mjs                 # lấy giá hiện tại
node scripts/fetch-gold.mjs --backfill      # + lịch sử Wayback (khi archive online)
```

## Nút trong giao diện

| Nút | Chức năng |
|---|---|
| **⟳ Cập nhật ngay** | Lấy bảng giá hiện tại ngay (qua CORS proxy), ghi vào bộ nhớ cục bộ. |
| **⤓ Tải lịch sử 1 năm (Wayback)** | Backfill ngay trong trình duyệt (cách dự phòng; bản chạy trên GitHub Action không vướng CORS). |
| **■ Dừng** | Dừng backfill — chạy lại được, ngày đã có sẽ bỏ qua. |
| **Xuất CSV / Sao lưu JSON / Nhập JSON** | Xuất & backup dữ liệu. |
| **Xóa dữ liệu** | Xoá dữ liệu **cục bộ** (không ảnh hưởng `data/gold.json` trên repo). |

## Về dữ liệu 1 năm qua

Trang nguồn không có API lịch sử (chỉ render bảng giá hiện tại), nên lịch sử lấy từ
**Wayback Machine** — mỗi ngày 1 bản lưu × 366 ngày. Internet Archive hiện *tạm ngừng*;
khi online lại: bấm nút backfill trong trang, hoặc vào **Actions → Run workflow → backfill=true**.

## Cấu trúc thư mục

```
index.html                          # web app (HTML + CSS + JS)
data/gold.json                      # ← DỮ LIỆU CHUNG (do Action ghi)
scripts/gold-parse.mjs              # parse bảng giá (dùng chung Node/trình duyệt)
scripts/fetch-gold.mjs              # script thu thập cho GitHub Action
.github/workflows/daily-gold.yml    # cron 14:00 VN mỗi ngày
serve.ps1                           # server local để chạy app
README.md
```
