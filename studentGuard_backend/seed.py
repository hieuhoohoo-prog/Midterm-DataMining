# seed.py
import os
import csv
from database import SessionLocal, engine
import models, security

# Đường dẫn trỏ tới file CSV sạch của Data Lead
CSV_PATH = "../StudentGuard_DataLead_bundle/data/processed/student_dropout_clean.csv"

def seed_database():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Tạo tài khoản Admin và Academic Advisor mặc định
        if db.query(models.User).count() == 0:
            users = [
                models.User(
                    username="admin",
                    full_name="System Administrator",
                    hashed_password=security.hash_password("admin123"),
                    role="Admin",
                ),
                models.User(
                    username="advisor",
                    full_name="Academic Advisor 01",
                    hashed_password=security.hash_password("advisor123"),
                    role="Academic Advisor",
                ),
            ]
            db.add_all(users)
            db.commit()
            print("[OK] Đã tạo tài khoản mẫu: admin/admin123 và advisor/advisor123")

        # 2. Nạp 4,424 dòng bằng thư viện CSV mặc định (Bypass lỗi AppLocker của Pandas)
        if db.query(models.Student).count() == 0:
            if not os.path.exists(CSV_PATH):
                print(f"[CẢNH BÁO] Không tìm thấy file tại {CSV_PATH}. Hãy kiểm tra lại đường dẫn!")
                return

            student_objs = []
            
            with open(CSV_PATH, mode="r", encoding="utf-8-sig") as file:
                reader = csv.DictReader(file)
                for idx, row in enumerate(reader, start=1):
                    student_data = {
                        "student_code": f"SV{idx:04d}"
                    }
                    
                    # Ép kiểu dữ liệu vì DictReader luôn đọc ra chuỗi (string)
                    for key, value in row.items():
                        if key == "target":
                            student_data[key] = value if value else None
                        elif "grade" in key or "rate" in key or "gdp" in key:
                            student_data[key] = float(value)
                        else:
                            student_data[key] = int(value)
                            
                    student_objs.append(models.Student(**student_data))

            # Batch insert giúp đẩy hơn 4000 dòng vào DB chỉ trong chưa tới 1 giây
            db.bulk_save_objects(student_objs)
            db.commit()
            print(f"[OK] Đã nạp thành công {len(student_objs)} sinh viên vào Database!")
        else:
            print("[INFO] Database đã có sẵn dữ liệu sinh viên.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()