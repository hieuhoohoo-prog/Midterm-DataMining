# StudentGuard data dictionary

Nguồn định nghĩa: [UCI dataset 697](https://archive.ics.uci.edu/dataset/697/predict+students+dropout+and+academic+success). Tên cột trong file clean dùng `snake_case`; cột raw không bị sửa.

| Tên cột clean | Tên cột raw UCI | Ý nghĩa | Kiểu dữ liệu clean | Nhóm feature | Dùng ở Enrollment Model? |
|---|---|---|---|---|---|
| `marital_status` | `Marital status` | Tình trạng hôn nhân tại thời điểm nhập học (mã phân loại UCI). | `int64` | `enrollment_demographic` | Có |
| `application_mode` | `Application mode` | Phương thức hoặc diện tuyển sinh (mã phân loại UCI). | `int64` | `enrollment_application` | Có |
| `application_order` | `Application order` | Thứ tự nguyện vọng, từ 0 là nguyện vọng đầu đến 9 là cuối. | `int64` | `enrollment_application` | Có |
| `course` | `Course` | Chương trình/ngành học sinh viên đăng ký (mã khóa học UCI). | `int64` | `enrollment_application` | Có |
| `daytime_evening_attendance` | `Daytime/evening attendance` | Hình thức học: 1 ban ngày, 0 buổi tối. | `int64` | `enrollment_application` | Có |
| `previous_qualification` | `Previous qualification` | Bằng cấp/trình độ trước khi nhập học (mã phân loại UCI). | `int64` | `enrollment_academic_history` | Có |
| `previous_qualification_grade` | `Previous qualification (grade)` | Điểm của bằng cấp trước đó, thang 0–200. | `float64` | `enrollment_academic_history` | Có |
| `nationality` | `Nacionality` | Quốc tịch (cột gốc UCI viết là `Nacionality`; giá trị là mã phân loại). | `int64` | `enrollment_demographic` | Có |
| `mothers_qualification` | `Mother's qualification` | Trình độ học vấn của mẹ (mã phân loại UCI). | `int64` | `enrollment_demographic` | Có |
| `fathers_qualification` | `Father's qualification` | Trình độ học vấn của cha (mã phân loại UCI). | `int64` | `enrollment_demographic` | Có |
| `mothers_occupation` | `Mother's occupation` | Nghề nghiệp của mẹ (mã phân loại UCI; mã 99 là nhóm `(blank)` theo metadata, không phải NA). | `int64` | `enrollment_demographic` | Có |
| `fathers_occupation` | `Father's occupation` | Nghề nghiệp của cha (mã phân loại UCI; mã 99 là nhóm `(blank)` theo metadata, không phải NA). | `int64` | `enrollment_demographic` | Có |
| `admission_grade` | `Admission grade` | Điểm đầu vào, thang 0–200. | `float64` | `enrollment_academic_history` | Có |
| `displaced` | `Displaced` | Sinh viên học xa nơi cư trú: 1 có, 0 không. | `int64` | `enrollment_demographic` | Có |
| `educational_special_needs` | `Educational special needs` | Có nhu cầu giáo dục đặc biệt: 1 có, 0 không. | `int64` | `enrollment_demographic` | Có |
| `debtor` | `Debtor` | Có tình trạng nợ: 1 có, 0 không. | `int64` | `enrollment_financial` | Có |
| `tuition_fees_up_to_date` | `Tuition fees up to date` | Học phí đã được thanh toán đúng hạn: 1 có, 0 không. | `int64` | `enrollment_financial` | Có |
| `gender` | `Gender` | Giới tính theo mã nguồn: 1 nam, 0 nữ. | `int64` | `enrollment_demographic` | Có |
| `scholarship_holder` | `Scholarship holder` | Có học bổng: 1 có, 0 không. | `int64` | `enrollment_financial` | Có |
| `age_at_enrollment` | `Age at enrollment` | Tuổi tại thời điểm nhập học. | `int64` | `enrollment_demographic` | Có |
| `international` | `International` | Sinh viên quốc tế: 1 có, 0 không. | `int64` | `enrollment_demographic` | Có |
| `curricular_units_1st_sem_credited` | `Curricular units 1st sem (credited)` | Số học phần được công nhận/chuyển đổi trong học kỳ 1. | `int64` | `semester_1_academic` | Không |
| `curricular_units_1st_sem_enrolled` | `Curricular units 1st sem (enrolled)` | Số học phần đăng ký trong học kỳ 1. | `int64` | `semester_1_academic` | Không |
| `curricular_units_1st_sem_evaluations` | `Curricular units 1st sem (evaluations)` | Số lượt đánh giá/thi của học phần trong học kỳ 1. | `int64` | `semester_1_academic` | Không |
| `curricular_units_1st_sem_approved` | `Curricular units 1st sem (approved)` | Số học phần đạt trong học kỳ 1. | `int64` | `semester_1_academic` | Không |
| `curricular_units_1st_sem_grade` | `Curricular units 1st sem (grade)` | Điểm trung bình học kỳ 1, thang 0–20. | `float64` | `semester_1_academic` | Không |
| `curricular_units_1st_sem_without_evaluations` | `Curricular units 1st sem (without evaluations)` | Số học phần không có đánh giá trong học kỳ 1. | `int64` | `semester_1_academic` | Không |
| `curricular_units_2nd_sem_credited` | `Curricular units 2nd sem (credited)` | Số học phần được công nhận/chuyển đổi trong học kỳ 2. | `int64` | `semester_2_academic` | Không |
| `curricular_units_2nd_sem_enrolled` | `Curricular units 2nd sem (enrolled)` | Số học phần đăng ký trong học kỳ 2. | `int64` | `semester_2_academic` | Không |
| `curricular_units_2nd_sem_evaluations` | `Curricular units 2nd sem (evaluations)` | Số lượt đánh giá/thi của học phần trong học kỳ 2. | `int64` | `semester_2_academic` | Không |
| `curricular_units_2nd_sem_approved` | `Curricular units 2nd sem (approved)` | Số học phần đạt trong học kỳ 2. | `int64` | `semester_2_academic` | Không |
| `curricular_units_2nd_sem_grade` | `Curricular units 2nd sem (grade)` | Điểm trung bình học kỳ 2, thang 0–20. | `float64` | `semester_2_academic` | Không |
| `curricular_units_2nd_sem_without_evaluations` | `Curricular units 2nd sem (without evaluations)` | Số học phần không có đánh giá trong học kỳ 2 (metadata UCI ghi nhầm học kỳ 1). | `int64` | `semester_2_academic` | Không |
| `unemployment_rate` | `Unemployment rate` | Tỷ lệ thất nghiệp (%) trong bối cảnh kinh tế liên quan. | `float64` | `enrollment_macro_context` | Có |
| `inflation_rate` | `Inflation rate` | Tỷ lệ lạm phát (%) trong bối cảnh kinh tế liên quan. | `float64` | `enrollment_macro_context` | Có |
| `gdp` | `GDP` | Chỉ số/tăng trưởng GDP trong bối cảnh kinh tế liên quan. | `float64` | `enrollment_macro_context` | Có |
| `target` | `Target` | Kết quả cuối thời gian chuẩn của khóa học: Dropout, Enrolled hoặc Graduate. | `string` | `target` | Không |

## Ghi chú mã phân loại

Các cột dạng mã số vẫn được giữ nguyên để ML Lead quyết định encoding trong pipeline. Danh mục mã đầy đủ nằm trong metadata UCI chính thức ở `data/raw/uci_dataset_697_metadata.json`. Mã 99 của nghề nghiệp cha/mẹ là một mức phân loại `(blank)` do UCI định nghĩa; pipeline không chuyển mã này thành NA.

## Nhóm theo thời điểm

- `enrollment_*`: có thể dùng ở thời điểm nhập học, với điều kiện hệ thống sản xuất xác nhận timestamp của dữ liệu tài chính và kinh tế vĩ mô.
- `semester_1_academic`: chỉ dùng sau khi học kỳ 1 đã kết thúc và dữ liệu đã chốt.
- `semester_2_academic`: chỉ dùng sau khi học kỳ 2 đã kết thúc và dữ liệu đã chốt.
- `target`: nhãn kết quả cuối khóa; tuyệt đối không dùng làm feature.
