# models.py
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False)  # "Admin" hoặc "Academic Advisor"


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    student_code = Column(String(20), unique=True, index=True, nullable=False)

    # --- 24 Cột Enrollment & Macro ---
    marital_status = Column(Integer, nullable=False)
    application_mode = Column(Integer, nullable=False)
    application_order = Column(Integer, nullable=False)
    course = Column(Integer, nullable=False)
    daytime_evening_attendance = Column(Integer, nullable=False)
    previous_qualification = Column(Integer, nullable=False)
    previous_qualification_grade = Column(Float, nullable=False)
    nationality = Column(Integer, nullable=False)
    mothers_qualification = Column(Integer, nullable=False)
    fathers_qualification = Column(Integer, nullable=False)
    mothers_occupation = Column(Integer, nullable=False)
    fathers_occupation = Column(Integer, nullable=False)
    admission_grade = Column(Float, nullable=False)
    displaced = Column(Integer, nullable=False)
    educational_special_needs = Column(Integer, nullable=False)
    debtor = Column(Integer, nullable=False)
    tuition_fees_up_to_date = Column(Integer, nullable=False)
    gender = Column(Integer, nullable=False)
    scholarship_holder = Column(Integer, nullable=False)
    age_at_enrollment = Column(Integer, nullable=False)
    international = Column(Integer, nullable=False)
    unemployment_rate = Column(Float, nullable=False)
    inflation_rate = Column(Float, nullable=False)
    gdp = Column(Float, nullable=False)

    # --- 6 Cột Semester 1 ---
    curricular_units_1st_sem_credited = Column(Integer, nullable=False)
    curricular_units_1st_sem_enrolled = Column(Integer, nullable=False)
    curricular_units_1st_sem_evaluations = Column(Integer, nullable=False)
    curricular_units_1st_sem_approved = Column(Integer, nullable=False)
    curricular_units_1st_sem_grade = Column(Float, nullable=False)
    curricular_units_1st_sem_without_evaluations = Column(Integer, nullable=False)

    # --- 6 Cột Semester 2 ---
    curricular_units_2nd_sem_credited = Column(Integer, nullable=False)
    curricular_units_2nd_sem_enrolled = Column(Integer, nullable=False)
    curricular_units_2nd_sem_evaluations = Column(Integer, nullable=False)
    curricular_units_2nd_sem_approved = Column(Integer, nullable=False)
    curricular_units_2nd_sem_grade = Column(Float, nullable=False)
    curricular_units_2nd_sem_without_evaluations = Column(Integer, nullable=False)

    # --- Cột Target gốc ---
    target = Column(String(20), nullable=True)  # "Dropout", "Enrolled", "Graduate"


class PredictionHistory(Base):
    __tablename__ = "prediction_history"

    id = Column(Integer, primary_key=True, index=True)
    student_code = Column(String(20), index=True, nullable=False)
    stage = Column(String(20), nullable=False)            # "enrollment", "semester_1", "semester_2"
    risk_score = Column(Float, nullable=False)            # 0.0 -> 1.0
    risk_level = Column(String(20), nullable=False)       # "High", "Medium", "Low"
    predicted_label = Column(String(20), nullable=False)  # "Dropout", "Enrolled", "Graduate"
    evaluated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))