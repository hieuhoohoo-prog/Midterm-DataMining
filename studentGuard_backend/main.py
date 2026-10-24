# main.py
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional

import database, models, schemas, security

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="StudentGuard Backend API", version="1.0.0")

# Allow the frontend to call the API without CORS errors
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 1. AUTH & AUTHORIZATION API (AUTH & ADMIN)
# ==========================================
@app.post("/api/auth/login", response_model=schemas.TokenResponse, tags=["1. Auth & Authorization"])
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db),
):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    token = security.create_access_token(data={"sub": user.username, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "full_name": user.full_name,
    }

@app.get("/api/auth/me", response_model=schemas.UserOut, tags=["1. Auth & Authorization"])
def get_my_profile(current_user: models.User = Depends(security.get_current_user)):
    return current_user

@app.post("/api/users", response_model=schemas.UserOut, tags=["1. Auth & Authorization"])
def create_user_by_admin(
    new_user: schemas.UserCreate,
    db: Session = Depends(database.get_db),
    admin_user: models.User = Depends(security.require_admin),  # ADMIN ONLY
):
    existing = db.query(models.User).filter(models.User.username == new_user.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    user_obj = models.User(
        username=new_user.username,
        full_name=new_user.full_name,
        hashed_password=security.hash_password(new_user.password),
        role=new_user.role,
    )
    db.add(user_obj)
    db.commit()
    db.refresh(user_obj)
    return user_obj

@app.get("/api/users", response_model=List[schemas.UserOut], tags=["1. Auth & Authorization"])
def list_users_by_admin(
    db: Session = Depends(database.get_db),
    admin_user: models.User = Depends(security.require_admin),  # ADMIN ONLY
):
    return db.query(models.User).all()

# ==========================================
# 2. STUDENT MANAGEMENT & SEARCH API
# ==========================================
@app.get("/api/students", response_model=List[schemas.StudentOut], tags=["2. Students"])
def get_students(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    target_filter: Optional[str] = Query(None, description="Filter by Dropout, Enrolled, Graduate"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.require_advisor_or_admin),
):
    query = db.query(models.Student)
    if target_filter:
        query = query.filter(models.Student.target == target_filter)
    return query.offset(skip).limit(limit).all()

@app.get("/api/students/{student_code}", response_model=schemas.StudentOut, tags=["2. Students"])
def get_student_detail(
    student_code: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.require_advisor_or_admin),
):
    student = db.query(models.Student).filter(models.Student.student_code == student_code).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

# ==========================================
# 3. DROP-OUT RISK PREDICTION API (PREDICTION)
# ==========================================
def calculate_risk_and_save(
    student_code: str,
    stage: str,
    features_dict: dict,
    db: Session,
    user_id: int,
) -> models.PredictionHistory:
    # Temporary risk score logic while waiting for the .pkl file from the ML Lead
    # When the ML Lead sends the model.pkl file, you only need to replace the 3 lines below with model.predict_proba()
    risk_score = 0.15
    if features_dict.get("tuition_fees_up_to_date") == 0:
        risk_score += 0.35
    if features_dict.get("debtor") == 1:
        risk_score += 0.20
    if stage in ["semester_1", "semester_2"] and features_dict.get("curricular_units_1st_sem_grade", 20) < 10:
        risk_score += 0.25

    risk_score = min(round(risk_score, 2), 0.99)

    if risk_score >= 0.70:
        risk_level, predicted_label = "High", "Dropout"
    elif risk_score >= 0.40:
        risk_level, predicted_label = "Medium", "Enrolled"
    else:
        risk_level, predicted_label = "Low", "Graduate"

    record = models.PredictionHistory(
        student_code=student_code,
        stage=stage,
        risk_score=risk_score,
        risk_level=risk_level,
        predicted_label=predicted_label,
        evaluated_by=user_id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@app.post("/api/predict/enrollment", response_model=schemas.PredictionResponse, tags=["3. Risk Prediction"])
def predict_at_enrollment(
    student_code: str,
    payload: schemas.EnrollmentFeatures,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.require_advisor_or_admin),
):
    return calculate_risk_and_save(
        student_code, "enrollment", payload.model_dump(), db, current_user.id
    )

@app.post("/api/predict/semester-1", response_model=schemas.PredictionResponse, tags=["3. Risk Prediction"])
def predict_after_semester_1(
    student_code: str,
    payload: schemas.Semester1Features,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.require_advisor_or_admin),
):
    return calculate_risk_and_save(
        student_code, "semester_1", payload.model_dump(), db, current_user.id
    )

@app.post("/api/predict/semester-2", response_model=schemas.PredictionResponse, tags=["3. Risk Prediction"])
def predict_after_semester_2(
    student_code: str,
    payload: schemas.Semester2Features,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.require_advisor_or_admin),
):
    return calculate_risk_and_save(
        student_code, "semester_2", payload.model_dump(), db, current_user.id
    )

@app.get("/api/predictions/history", response_model=List[schemas.PredictionResponse], tags=["3. Risk Prediction"])
def get_prediction_history(
    limit: int = 50,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.require_advisor_or_admin),
):
    return (
        db.query(models.PredictionHistory)
        .order_by(models.PredictionHistory.created_at.desc())
        .limit(limit)
        .all()
    )