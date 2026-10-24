# StudentGuard EDA summary

## Phạm vi và chất lượng dữ liệu

- Raw: **4,424 dòng × 37 cột**. Clean: **4,424 dòng × 37 cột**.
- Missing cells: **0**. Exact duplicate rows trong raw: **0**.
- Toàn bộ mã phân loại quan sát được nằm trong danh mục metadata UCI; các biến điểm nằm trong thang chính thức; các biến đếm không âm và là số nguyên.
- Có **3** bản ghi mà `curricular_units_2nd_sem_without_evaluations` lớn hơn `curricular_units_2nd_sem_enrolled`. Pipeline giữ nguyên vì chưa có bằng chứng đây là lỗi và UCI không cung cấp khóa bản ghi để đối soát.
- Không có outlier nào bị xóa, cắt ngọn hoặc thay thế. IQR chỉ được dùng để gắn cờ mô tả; các giá trị vẫn nằm trong miền hợp lệ hoặc có diễn giải hợp lý (ví dụ sinh viên lớn tuổi, học phần được công nhận, số lượt đánh giá cao).

## Phân bố target

| Target | Số lượng | Tỷ lệ |
|---|---:|---:|
| Dropout | 1,421 | 32.12% |
| Enrolled | 794 | 17.95% |
| Graduate | 2,209 | 49.93% |

Lớp `Enrolled` chỉ chiếm 17.95%, vì vậy accuracy tổng thể không đủ để đánh giá model. ML Lead nên theo dõi macro-F1, per-class recall/precision và confusion matrix trên tập test chưa từng thấy.

## Insight chính

1. **Tình trạng học phí có tín hiệu rất mạnh:** nhóm chưa đóng học phí đúng hạn có tỷ lệ Dropout **86.6%**, so với **24.7%** ở nhóm đã đóng đúng hạn.
2. **Nợ và học bổng liên hệ rõ với kết quả:** tỷ lệ Dropout là **62.0%** ở nhóm có nợ so với **28.3%** ở nhóm không nợ; ở người có học bổng là **12.2%** so với **38.7%** ở người không có học bổng. Đây là liên hệ mô tả, không phải quan hệ nhân quả.
3. **Số học phần đạt phân tách nhóm rất rõ:** median học kỳ 1 là 2 ở Dropout và 6 ở Graduate; học kỳ 2 tương ứng là 0 và 6.
4. **Điểm sau nhập học mạnh hơn điểm đầu vào:** median điểm đầu vào chỉ chênh 3.8 điểm giữa Graduate và Dropout, trong khi median điểm học kỳ 2 là 13.0 ở Graduate và 0.0 ở Dropout.
5. **Nhóm Dropout lớn tuổi hơn:** tuổi nhập học trung bình là 26.1 ở Dropout so với 21.8 ở Graduate; cần kiểm tra fairness và hiệu năng theo nhóm tuổi.

## Outlier decisions

IQR flags nhiều nhất (không loại bỏ):

| Biến | Số bản ghi bị gắn cờ IQR | Quyết định |
|---|---:|---|
| `curricular_units_2nd_sem_grade` | 877 | Giữ nguyên; kiểm tra bằng domain/range rule thay vì xóa cơ học. |
| `curricular_units_1st_sem_grade` | 726 | Giữ nguyên; kiểm tra bằng domain/range rule thay vì xóa cơ học. |
| `curricular_units_1st_sem_credited` | 577 | Giữ nguyên; kiểm tra bằng domain/range rule thay vì xóa cơ học. |
| `application_order` | 541 | Giữ nguyên; kiểm tra bằng domain/range rule thay vì xóa cơ học. |
| `curricular_units_2nd_sem_credited` | 530 | Giữ nguyên; kiểm tra bằng domain/range rule thay vì xóa cơ học. |
| `age_at_enrollment` | 441 | Giữ nguyên; kiểm tra bằng domain/range rule thay vì xóa cơ học. |
| `curricular_units_1st_sem_enrolled` | 424 | Giữ nguyên; kiểm tra bằng domain/range rule thay vì xóa cơ học. |
| `curricular_units_2nd_sem_enrolled` | 369 | Giữ nguyên; kiểm tra bằng domain/range rule thay vì xóa cơ học. |

## Data leakage risks

- `target` là kết quả cuối khóa và không xuất hiện trong bất kỳ feature set nào.
- Không dùng cột học kỳ 1/2 cho Enrollment Model; chỉ mở khóa dữ liệu học kỳ sau khi kỳ đó đã kết thúc và dữ liệu được chốt.
- UCI không cung cấp timestamp theo từng trường. Trước khi triển khai, cần xác nhận `debtor`, `tuition_fees_up_to_date`, `scholarship_holder`, `unemployment_rate`, `inflation_rate` và `gdp` thật sự là snapshot có sẵn tại thời điểm dự đoán.
- Encoder, scaler, imputer, feature selection và SMOTE phải được fit chỉ trên training fold trong pipeline; tuyệt đối không fit trước khi chia dữ liệu hoặc trước cross-validation.
- Nếu nhiều bản ghi của cùng sinh viên xuất hiện trong dữ liệu sản xuất, phải group split theo student ID. Dataset UCI này không cung cấp ID nên không thể kiểm tra rủi ro đó.
- Vì Semester 2 rất gần nhãn kết quả, cần mô tả model này là cảnh báo sau học kỳ 2, không phải dự báo tại nhập học.

## Biểu đồ

- `outputs/figures/target_distribution.png`
- `outputs/figures/key_numeric_distributions.png`
- `outputs/figures/dropout_rate_by_financial_status.png`
- `outputs/figures/academic_units_by_target.png`
- `outputs/figures/grades_by_target.png`
- `outputs/figures/iqr_outlier_flags.png`
