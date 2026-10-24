# schemas.py
from pydantic import BaseModel, ConfigDict
from typing import Optional, Literal
from datetime import datetime

# --- 1. Auth & User Schemas ---
class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: str

class UserCreate(BaseModel):
    username: str
    full_name: str
    password: str
    role: Literal["Admin", "Academic Advisor"]

class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    model_config = ConfigDict(from_attributes=True)

# --- 2. Feature Schemas (Inherited across 3 stages) ---
class EnrollmentFeatures(BaseModel):
    marital_status: int
    application_mode: int
    application_order: int
    course: int
    daytime_evening_attendance: int
    previous_qualification: int
    previous_qualification_grade: float
    nationality: int
    mothers_qualification: int
    fathers_qualification: int
    mothers_occupation: int
    fathers_occupation: int
    admission_grade: float
    displaced: int
    educational_special_needs: int
    debtor: int
    tuition_fees_up_to_date: int
    gender: int
    scholarship_holder: int
    age_at_enrollment: int
    international: int
    unemployment_rate: float
    inflation_rate: float
    gdp: float

class Semester1Features(EnrollmentFeatures):
    curricular_units_1st_sem_credited: int
    curricular_units_1st_sem_enrolled: int
    curricular_units_1st_sem_evaluations: int
    curricular_units_1st_sem_approved: int
    curricular_units_1st_sem_grade: float
    curricular_units_1st_sem_without_evaluations: int

class Semester2Features(Semester1Features):
    curricular_units_2nd_sem_credited: int
    curricular_units_2nd_sem_enrolled: int
    curricular_units_2nd_sem_evaluations: int
    curricular_units_2nd_sem_approved: int
    curricular_units_2nd_sem_grade: float
    curricular_units_2nd_sem_without_evaluations: int

# --- 3. Student & Prediction Schemas ---
class StudentOut(Semester2Features):
    id: int
    student_code: str
    target: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class PredictionResponse(BaseModel):
    id: int
    student_code: str
    stage: str
    risk_score: float
    risk_level: str
    predicted_label: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)