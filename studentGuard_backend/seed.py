# seed.py
import os
import csv
from database import SessionLocal, engine
import models, security

# Path to the cleaned CSV file from the Data Lead
CSV_PATH = "../StudentGuard_DataLead_bundle/data/processed/student_dropout_clean.csv"

def seed_database():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Create default Admin and Academic Advisor accounts
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
            print("[OK] Created sample accounts: admin/admin123 and advisor/advisor123")

        # 2. Import 4,424 rows using the default CSV library (bypass Pandas AppLocker issues)
        if db.query(models.Student).count() == 0:
            if not os.path.exists(CSV_PATH):
                print(f"[WARNING] File not found at {CSV_PATH}. Please check the path again!")
                return

            student_objs = []

            with open(CSV_PATH, mode="r", encoding="utf-8-sig") as file:
                reader = csv.DictReader(file)
                for idx, row in enumerate(reader, start=1):
                    student_data = {
                        "student_code": f"SV{idx:04d}"
                    }

                    # Force data types because DictReader always reads strings
                    for key, value in row.items():
                        if key == "target":
                            student_data[key] = value if value else None
                        elif "grade" in key or "rate" in key or "gdp" in key:
                            student_data[key] = float(value)
                        else:
                            student_data[key] = int(value)

                    student_objs.append(models.Student(**student_data))

            # Batch insert helps push more than 4,000 rows into the DB in under 1 second
            db.bulk_save_objects(student_objs)
            db.commit()
            print(f"[OK] Successfully imported {len(student_objs)} students into the database!")
        else:
            print("[INFO] The database already contains student data.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()