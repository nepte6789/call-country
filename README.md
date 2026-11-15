# THẮP SÁNG VIỆT NAM — Call Country

Game TikTok LIVE chỉ chơi ở Việt Nam: bản đồ 34 tỉnh/thành, hiệu ứng bay tới quê vừa được gọi tên, đất thắp vàng, vòng sáng, cột sáng theo điểm, avatar người tham gia, bảng xếp hạng, thông báo quà tặng và câu đố quê hương. Thiết kế riêng kết hợp cơ chế thắp sáng tỉnh/thành với nhịp hiệu ứng của video đua quốc gia; không chép bản thu, logo, video hoặc giao diện TikTok.

## Chạy trên Windows / macOS / Linux

Cài Node.js 20.12 trở lên (khuyên Node 22 LTS), rồi mở terminal:

```powershell
git clone https://github.com/nepte6789/call-country.git
cd call-country
npm install
npm start
```

Nếu đang chạy Vua Sinh Tồn ở cổng 3000, dừng ứng dụng đó hoặc đặt `PORT=3001` trong `.env` của Call Country, sau đó mở localhost:3001.

Đã clone thì vào đúng thư mục `call-country` trước khi chạy `npm install` / `npm start`. Điều khiển: http://localhost:3000/ ; màn hình LIVE: http://localhost:3000/overlay.html . OBS Browser Source: 1080 × 1920. Overlay tự co theo cửa sổ. Nếu TikTok LIVE Studio không hỗ trợ URL local, dùng Window Capture cửa sổ Chrome hoặc OBS Virtual Camera.

## Kết nối LIVE

Nhập link hoặc `@username` ở terminal khi khởi động, hoặc bảng điều khiển rồi bấm Kết nối. Chỉ nhập tên kênh đang LIVE; ứng dụng nhận tương tác, không phát video lên TikTok. Không cần mật khẩu TikTok. Khi gián đoạn, tự thử lại sau 2 phút; trạng thái server và LIVE hiển thị riêng.

Nếu dịch vụ ký yêu cầu EulerStream, tạo file `.env` cạnh `package.json`:

```dotenv
EULERSTREAM_API_KEY=key_cua_ban
TIKTOK_CHANNEL=tenkenh
PORT=3000
```

`npm start` tự đọc `.env` trên Node hỗ trợ `process.loadEnvFile`. Có thể dùng `node --env-file=.env server.mjs`. File `.env` được bỏ qua Git; key chỉ nằm trên server, không gửi cho overlay/bảng điều khiển. Lỗi Business plan còn phụ thuộc quyền dịch vụ ký của tài khoản EulerStream; thêm key không tự nâng gói. Đã tắt tải danh mục quà mở rộng.

## Cách chơi và tính điểm

- Bình luận tên tỉnh/thành hiện tại hoặc tên cũ: `Hà Nội`, `Tôi ở Bình Định`, `Bến Tre`, `Sài Gòn`… Tên không dấu được nhận. Chọn quê lần đầu +1 điểm. Bình luận lặp không cộng điểm. Đổi quê thì điểm trước đó vẫn thuộc quê đã nhận, điểm sau thuộc quê mới.
- Mỗi **10 tim = 1 điểm**, phần dư được giữ riêng từng người. Không dùng tổng tim tích lũy của cả LIVE để cộng lặp.
- Mỗi **1 xu quà = 1 điểm**, nhân số quà. Combo chỉ cộng phần tăng mới, không cộng lại khi sự kiện kết thúc combo đến. Không mua/bán hoặc phát quà bằng ứng dụng.
- Follow +5 điểm, một lần/người/ván. Hệ số tim/xu/follow chỉnh được trong bảng điều khiển.
- Tim/quà trước khi chọn quê được giữ chờ. Bình luận tên quê để chuyển điểm về quê đó.
- Bộ 60 câu đơn giản / 6 chủ đề: Việt Nam, Toán nhẩm, Đời sống, Con vật, Ăn uống, Thiên nhiên. Bình luận đáp án tiếng Việt (có dấu/không dấu) hoặc số, không cần A/B/C/D. Mặc định 20 giây/câu để đọc và trả lời, sau đó nghỉ 10 giây hiển thị đáp án; đúng +10 điểm, mỗi người một lần/câu. Trong bảng điều khiển, mục “Câu hỏi cộng điểm” có toàn bộ câu/đáp án, lọc, tải JSON, đổi chủ đề, chỉnh 10–180 giây/câu và điểm thưởng, chuyển câu thủ công. Trên overlay, khung Đố vui quê mình nằm bên phải dưới xếp hạng, có hướng dẫn trả lời và đáp án khi hết giờ và đếm ngược nghỉ 10 giây.
- Ván mặc định 20 phút, tự ghi quê dẫn đầu rồi mở ván mới. Tạm dừng thì ngừng nhận điểm và giữ đồng hồ. Đổi thời gian sẽ đếm lại ván từ lúc lưu.
- Có 1–100 người thử, tự chọn quê/thả tim/tặng quà mô phỏng. Khi bật người thử, lấy số lượng khởi đầu đã đặt (mặc định 12), rồi cứ 3 phút tăng thêm ngẫu nhiên 1–2 người, tối đa 100. Khi tạm dừng, đồng hồ thêm người cũng dừng; tắt hoặc xóa người thử sẽ dừng lịch tự thêm. Xóa người thử chỉ trừ đóng góp của người thử, giữ điểm người thật. Không tạo bình luận/tim/quà hoặc người xem trên TikTok.

Bấm “Bật giọng đọc và nhạc nền” để đọc chào người mới, quà, câu trả lời đúng và thưởng theo dõi bằng giọng Việt cài trên trình duyệt/máy. Không có giọng Việt thì giao diện vẫn hoạt động; không tự tải giọng từ dịch vụ bên ngoài. Không kèm nhạc có bản quyền hoặc âm thanh từ hai video mẫu.

## Dữ liệu bản đồ

34 vùng được gộp theo tên tỉnh/thành sau sáp nhập 2025, từ bộ hình học nguồn cũ geoBoundaries Public Domain; bản đồ được đơn giản hoá để làm game, **không phải dữ liệu địa giới hành chính chính thức hiện hành**. Nguồn không biểu diễn đầy đủ các khu vực ngoài khơi. Xem [data/SOURCES.md](data/SOURCES.md) cho nguồn, giới hạn và cách tạo lại dữ liệu. Bản đồ chạy local, không cần API bản đồ. Font Be Vietnam Pro kèm giấy phép OFL.

## Kiểm tra / cấu trúc

```sh
npm test
```

`src/game.mjs`: tính điểm/alias/tim/quà/quiz/ván. `server.mjs`: HTTP, WebSocket, adapter TikTok và reconnect. `public/overlay.html`: màn hình dọc. `public/control.html`: điều khiển. `data/provinces.json`: hình học và tên cũ. Server chỉ nghe `127.0.0.1`, kiểm tra Host/Origin; overlay không có quyền điều khiển qua WebSocket. Chỉ phục vụ tệp giao diện, không phục vụ `.env`.

Kết nối TikTok thật phụ thuộc kênh đang LIVE, dịch vụ ký và mạng. Kiểm thử mô phỏng không thay thế xác minh một phiên LIVE thật.

Kiểm tra bản đầu: 9 kiểm thử tự động đạt; kiểm tra HTTP/WebSocket với 100 → 10 người thử, tính điểm, xóa mô phỏng và chặn lệnh điều khiển từ overlay. Chromium tải đủ 34 hình vùng, TOP 10, avatar và hiệu ứng, không có lỗi JavaScript. Phiên TikTok LIVE thật cần kiểm tra với kênh đang LIVE và cấu hình ký kết nối của bạn.

Lời đọc phần thưởng dùng câu tiếng Việt riêng, không đọc chuỗi ký hiệu giao diện. Ví dụ: “Cảm ơn Minh Anh đã tặng 10 bông hoa hồng. Quê Gia Lai được cộng thêm 10 điểm.” Nếu chưa chọn quê thì nhắc điểm đang chờ. Lời đọc được xếp hàng, không ghi đè khi có hai phần thưởng liên tiếp; hàng đợi giới hạn 30 lời, bỏ lời cũ quá 90 giây để tránh giọng đọc trễ kéo dài. Cần cài giọng Việt trên máy; ứng dụng không tự tải TTS trực tuyến.

Trả lời đúng một câu có đáp án trùng tên tỉnh/thành sẽ giữ quê đã chọn, ví dụ đang chọn Hà Tĩnh và trả lời “Hà Nội” cho câu thủ đô thì điểm thưởng vẫn về Hà Tĩnh. Dùng “quê tôi Hà Nội” nếu muốn đổi quê chủ động.

### Nhịp câu hỏi 20 + 10

Bấm bật giọng trên overlay để đọc câu hỏi ngay khi mở. Phần đọc nằm trong 20 giây trả lời, không cộng thêm thời gian sau khi đọc xong. Giọng đọc câu hỏi được ưu tiên hơn phần cảm ơn đang chờ; nếu đang đọc dở một lời thưởng, lời đó được giữ lại để đọc tiếp từ đầu sau câu hỏi. Không đọc tiếp một câu hỏi đã hết giờ.

Hết 20 giây: ngừng chấm câu hỏi đó, công bố đáp án và nghỉ 10 giây. Hết 10 giây mới mở câu tiếp theo. Tim, quà và chọn quê vẫn hoạt động trong khoảng nghỉ; đáp án gửi lúc nghỉ không có điểm câu hỏi. Nút “Câu tiếp theo” của người điều khiển có thể chủ động bỏ qua thời gian nghỉ.

### Chào người mới và nhạc nền

Nhận sự kiện người vào từ TikTok LIVE, chào tên và nhắc bình luận tên quê để thắp sáng bản đồ. Không tự chọn quê hoặc cộng điểm chỉ vì vào xem. Nhiều người đến cùng lúc được gộp tối đa 4 tên và số người còn lại; cách tối thiểu 10 giây giữa các đợt chào, không lặp cùng người trong 2 phút và không đọc lời chào đã cũ quá 20 giây. Có nút “Thử người vào LIVE” để kiểm tra. Khả năng nhận đầy đủ người vào phụ thuộc sự kiện TikTok gửi, không suy ra từ danh sách người xem trong ảnh.

Bấm “Bật giọng đọc và nhạc nền” một lần trên overlay. Nhạc Sunshine Homecoming vui nhộn, tự tổng hợp trong trình duyệt, không dùng bản thu hay sample bên thứ ba. Mức nhạc mặc định 18%, tối đa 35%, tự giảm còn 16% mức đang đặt trong khi đọc câu hỏi/lời chào/phần thưởng. Nút bật/tắt và thanh âm lượng nhạc độc lập với giọng đọc.

Bot tặng quà ít hơn: xác suất mỗi lượt tương tác từ 20% còn 10%, cách ít nhất 20 giây giữa các quà mô phỏng. Tim/bình luận và lịch thêm 1–2 bot sau 3 phút giữ nguyên. Thay đổi này không giảm điểm hoặc tần suất nhận quà thật.
