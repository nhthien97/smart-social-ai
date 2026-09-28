# MiniSocial Backend

Backend service cho hệ thống mạng xã hội **MiniSocial** – cung cấp API cho các chức năng quản lý người dùng, bài viết, tương tác, chat realtime và hệ thống đề xuất nội dung.

## Giới thiệu

MiniSocial là một hệ thống mạng xã hội thu nhỏ, mô phỏng các tính năng cốt lõi của nền tảng social media hiện đại:

- Đăng bài viết, chỉnh sửa, xoá bài viết
- Tương tác like/unlike, comment/reply
- Theo dõi người dùng và feed cá nhân hoá
- Chat realtime
- Recommendation System gợi ý nội dung

Backend xử lý logic nghiệp vụ, xác thực người dùng và cung cấp RESTful API cho frontend Web/Mobile.

---

## 🛠️ Công nghệ sử dụng

- **Framework:** NestJS
- **Ngôn ngữ:** TypeScript
- **Database:** MongoDB (Mongoose)
- **Authentication:** JWT (JSON Web Token)
- **REST API:** NestJS Controller/Service
- **Recommendation:** Python ML service
- **Testing:** Jest, unittest

---

## 📂 Cấu trúc thư mục

```text
src/
│── modules/
│   ├── auth/              # Xác thực & phân quyền
│   ├── users/             # Quản lý người dùng
│   ├── posts/             # Bài viết
│   ├── comments/          # Bình luận
│   ├── likes/             # Like/Reaction
│   ├── messages/          # Chat / tin nhắn
│   └── recommendation/    # Tích hợp hệ thống đề xuất
│
│── common/                # Utils, guards, filters
│── config/                # Cấu hình hệ thống
│── database/              # Kết nối DB
│── main.ts                # Entry point
```

---

## 🔑 Tính năng chính

### 📝 Post

- Tạo bài viết text/media
- Sửa bài viết
- Xoá mềm bài viết
- Lấy danh sách/feed bài viết
- Tích hợp recommendation/fallback feed

### 💬 Comment

- Tạo comment cho bài viết
- Reply comment
- Lấy comment theo bài viết
- Gửi notification cho chủ bài viết/chủ comment cha

### ❤️ Like

- Like/unlike bài viết hoặc comment
- Kiểm tra trạng thái đã like
- Ghi nhận interaction phục vụ recommendation
- Gửi notification khi like

### 💭 Chat

- Gửi tin nhắn trong conversation
- Kiểm tra quyền participant
- Chặn gửi tin khi bị block
- Sửa/recall/soft delete tin nhắn
- Ghi tin nhắn realtime sang Firestore

### 🤖 Recommendation

- Xây dựng hồ sơ tag người dùng từ hành vi tương tác
- Tính content-based score
- Kết hợp collaborative/content score trong hybrid recommendation
- Fallback popular/default posts khi thiếu dữ liệu
- Kiểm tra schema response gợi ý

---

## ⚙️ Cài đặt & chạy dự án

### 1. Clone repo

```bash
git clone https://github.com/miin000/MiniSocial_BE.git
cd MiniSocial_BE
```

### 2. Cài dependencies

```bash
npm install
```

### 3. Cấu hình môi trường

Tạo file `.env`:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/minisocial
JWT_SECRET=your_secret_key
```

### 4. Chạy server

```bash
npm run start:dev
```

Server mặc định:

```text
http://localhost:3000
```

---

## 📡 API Endpoint ví dụ

| Method | Endpoint        | Mô tả              |
| ------ | --------------- | ------------------ |
| POST   | /auth/register  | Đăng ký            |
| POST   | /auth/login     | Đăng nhập          |
| GET    | /users/:id      | Lấy thông tin user |
| POST   | /posts          | Tạo bài viết       |
| GET    | /posts/feed     | Lấy feed           |
| POST   | /posts/:id/like | Like bài viết      |

---

## 🧪 Kết quả kiểm thử hộp trắng

### 1. Phạm vi kiểm thử

Kiểm thử hộp trắng tập trung vào các nhánh logic chính của 5 nhóm chức năng:

| Nhóm chức năng | File/service được kiểm thử | Test file |
| --- | --- | --- |
| Post | `src/modules/posts/posts.service.ts` | `src/tests/post-interaction/posts.service.spec.ts` |
| Comment | `src/modules/comments/comments.service.ts` | `src/tests/post-interaction/comments.service.spec.ts` |
| Like | `src/modules/likes/likes.service.ts` | `src/tests/post-interaction/likes.service.spec.ts` |
| Chat | `src/modules/messages/messages.service.ts` | `src/tests/chat-realtime/messages.service.spec.ts` |
| Recommend | `ml_server/recommender/content_based.py`, schema response | `ml_server/tests/test_content_based.py` |

### 2. Lệnh đã chạy

Backend Jest tests:

```powershell
Set-Location -Path 'd:\MiniSocial\api'
npm test -- --runInBand --coverage --coverageReporters=text-summary --coverageReporters=text --runTestsByPath src\tests\post-interaction\posts.service.spec.ts src\tests\post-interaction\likes.service.spec.ts src\tests\post-interaction\comments.service.spec.ts src\tests\chat-realtime\messages.service.spec.ts
```

Recommendation Python tests:

```powershell
Set-Location -Path 'd:\MiniSocial\ml_server'
python -m unittest discover -s tests -v
```

### 3. Tổng hợp kết quả chạy test

Thời điểm chạy: **18/06/2026 00:34 (Asia/Saigon)**.

| Nhóm | Test suites | Test cases | Kết quả |
| --- | ---: | ---: | --- |
| Backend Post/Comment/Like/Chat | 4 passed / 4 total | 21 passed / 21 total | ✅ Pass |
| Recommendation ML service | 1 passed / 1 total | 5 passed / 5 total | ✅ Pass |
| Tổng cộng | 5 passed / 5 total | 26 passed / 26 total | ✅ Pass |

### 4. Coverage backend Jest

Coverage được tạo tại `api/coverage/` sau khi chạy subset kiểm thử hộp trắng.

| Metric | Kết quả |
| --- | ---: |
| Statements | 15.84% (611/3856) |
| Branches | 14.75% (326/2210) |
| Functions | 7.70% (45/584) |
| Lines | 16.07% (552/3433) |

> Lưu ý: coverage tổng thể thấp vì lệnh trên chỉ chạy subset kiểm thử hộp trắng cho Post, Comment, Like và Chat, trong khi Jest vẫn thu thập coverage toàn bộ `src`.

### 5. Chi tiết test case chính

| TC_ID | Chức năng | Mục tiêu white-box | Expected result | Actual result | Status |
| --- | --- | --- | --- | --- | --- |
| POST-01 | Tạo bài viết hợp lệ | Phủ nhánh happy path `PostsService.create`, lưu post, tăng counter, ghi activity log | Post được tạo đúng dữ liệu, trạng thái hợp lệ | Test pass | ✅ Pass |
| POST-02 | Validate bài viết rỗng | Phủ nhánh validation content/media | Từ chối bài viết không có nội dung hợp lệ | Test pass theo logic hiện tại | ✅ Pass |
| POST-03 | Cập nhật bài viết | Phủ nhánh update, set trạng thái chỉnh sửa | Bài viết được cập nhật và đánh dấu edited | Test pass | ✅ Pass |
| POST-04 | Xoá bài viết | Phủ nhánh soft delete | Bài viết chuyển sang trạng thái deleted | Test pass | ✅ Pass |
| LIKE-01 | Like lần đầu | Phủ nhánh chưa có like trước đó | Tạo like mới, trả `liked: true`, ghi interaction | Test pass | ✅ Pass |
| LIKE-02 | Unlike | Phủ nhánh đã tồn tại like | Xoá like, trả `liked: false` | Test pass | ✅ Pass |
| LIKE-03 | Kiểm tra trạng thái like | Phủ nhánh `checkLike` có/không có dữ liệu | Trả đúng trạng thái like | Test pass | ✅ Pass |
| COMMENT-01 | Tạo comment | Phủ happy path tạo comment, notification, interaction | Comment được lưu và xử lý side effects | Test pass | ✅ Pass |
| COMMENT-02 | Lấy comment theo post | Phủ nhánh truy vấn comment theo bài viết | Trả danh sách comment hợp lệ | Test pass | ✅ Pass |
| COMMENT-03 | Xoá comment | Phủ nhánh xoá/soft delete comment | Comment được xoá theo logic service | Test pass | ✅ Pass |
| CHAT-01 | Gửi tin nhắn hợp lệ | Phủ nhánh participant hợp lệ, save message, update last message, Firestore async | Tin nhắn được lưu và enrich | Test pass | ✅ Pass |
| CHAT-02 | User bị block gửi tin | Phủ nhánh `blocked_by` | Throw `ForbiddenException` | Test pass | ✅ Pass |
| CHAT-03 | Sửa tin nhắn của người khác | Phủ nhánh kiểm tra owner trong edit | Throw `ForbiddenException` | Test pass | ✅ Pass |
| RECO-01 | Build tag profile | Phủ nhánh cộng trọng số tag từ lịch sử tương tác | Tag profile cộng dồn đúng | Test pass | ✅ Pass |
| RECO-02 | Compute content score | Phủ nhánh bỏ bài đã xem, chuẩn hoá score | Chỉ trả bài chưa tương tác có score hợp lệ | Test pass | ✅ Pass |
| RECO-03 | Best matching tag | Phủ nhánh có/không có tag phù hợp | Trả tag tốt nhất hoặc `None` | Test pass | ✅ Pass |
| RECO-04 | Response schema | Phủ contract schema response recommendation | Payload hợp lệ được accept | Test pass | ✅ Pass |

### 6. Nhận xét white-box

- Các test backend đã đi qua các đường xử lý chính của service layer cho post, comment, like và chat.
- Các nhánh bảo mật quan trọng đã có kiểm thử ở chat như participant/block/owner edit.
- Recommendation đã có unit test cho content-based scoring và schema response.
- Một số nhánh tích hợp vẫn nên bổ sung thêm nếu cần tăng coverage: upload media, socket auth token, race condition like/unlike, fallback feed khi ML API lỗi, hybrid recommendation đầy đủ và group chat creation.

---

## Phân quyền

Hệ thống hỗ trợ 3 vai trò:

- **ADMIN:** Toàn quyền hệ thống
- **MODERATOR:** Quản lý nội dung
- **VIEWER / USER:** Người dùng bình thường

---

## Định hướng phát triển

- Tối ưu thuật toán recommendation
- Realtime notification bằng WebSocket/Firestore
- Bổ sung kiểm thử tích hợp cho upload, socket auth và recommendation fallback
- Microservices architecture
- Triển khai CI/CD

---

## Liên kết liên quan

- Frontend Web: [https://github.com/miin000/MiniSocial_nextjs](https://github.com/miin000/MiniSocial_nextjs)
- Mobile App: [https://github.com/miin000/MiniSocial_flutter](https://github.com/miin000/MiniSocial_flutter)
- Recommendation System: [https://github.com/miin000/MiniSocial_Recomendation_System](https://github.com/miin000/MiniSocial_Recomendation_System)

---

## Tác giả

- Phạm Quang Minh
