# extended_api.py
"""
Extended API endpoints supporting the StudentGuard frontend.

All routes live in this separate module (an APIRouter) so that the original
`main.py`, `models.py` and `schemas.py` stay untouched, which keeps merge
conflicts to a minimum. `main.py` only needs two lines at the very end:

    from extended_api import router as extended_router
    app.include_router(extended_router)

No new database tables or columns are created: everything is computed from
the existing `users`, `students` and `prediction_history` tables.
"""
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, create_model
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

import database, models, schemas, security

router = APIRouter()

PH = models.PredictionHistory
TargetLiteral = Literal["Dropout", "Enrolled", "Graduate"]
TARGETS = ["Dropout", "Enrolled", "Graduate"]

_BUNDLE_DIR = Path(__file__).resolve().parent.parent / "StudentGuard_DataLead_bundle"
_METADATA_PATH = _BUNDLE_DIR / "data" / "raw" / "uci_dataset_697_metadata.json"
_FEATURE_SETS_PATH = _BUNDLE_DIR / "data" / "processed" / "feature_sets.json"


# ==========================================
# 0. METADATA: field labels & categorical code options
# ==========================================
FIELD_LABELS_VI: Dict[str, str] = {
    "marital_status": "Tình trạng hôn nhân",
    "application_mode": "Phương thức tuyển sinh",
    "application_order": "Thứ tự nguyện vọng",
    "course": "Ngành học",
    "daytime_evening_attendance": "Hình thức học",
    "previous_qualification": "Trình độ trước khi nhập học",
    "previous_qualification_grade": "Điểm trình độ trước (0–200)",
    "nationality": "Quốc tịch",
    "mothers_qualification": "Trình độ học vấn của mẹ",
    "fathers_qualification": "Trình độ học vấn của cha",
    "mothers_occupation": "Nghề nghiệp của mẹ",
    "fathers_occupation": "Nghề nghiệp của cha",
    "admission_grade": "Điểm đầu vào (0–200)",
    "displaced": "Học xa nơi cư trú",
    "educational_special_needs": "Nhu cầu giáo dục đặc biệt",
    "debtor": "Đang nợ",
    "tuition_fees_up_to_date": "Học phí đúng hạn",
    "gender": "Giới tính",
    "scholarship_holder": "Có học bổng",
    "age_at_enrollment": "Tuổi khi nhập học",
    "international": "Sinh viên quốc tế",
    "unemployment_rate": "Tỷ lệ thất nghiệp (%)",
    "inflation_rate": "Tỷ lệ lạm phát (%)",
    "gdp": "GDP",
    "curricular_units_1st_sem_credited": "HK1 – Học phần được công nhận",
    "curricular_units_1st_sem_enrolled": "HK1 – Học phần đăng ký",
    "curricular_units_1st_sem_evaluations": "HK1 – Số lượt đánh giá",
    "curricular_units_1st_sem_approved": "HK1 – Học phần đạt",
    "curricular_units_1st_sem_grade": "HK1 – Điểm trung bình (0–20)",
    "curricular_units_1st_sem_without_evaluations": "HK1 – Học phần không đánh giá",
    "curricular_units_2nd_sem_credited": "HK2 – Học phần được công nhận",
    "curricular_units_2nd_sem_enrolled": "HK2 – Học phần đăng ký",
    "curricular_units_2nd_sem_evaluations": "HK2 – Số lượt đánh giá",
    "curricular_units_2nd_sem_approved": "HK2 – Học phần đạt",
    "curricular_units_2nd_sem_grade": "HK2 – Điểm trung bình (0–20)",
    "curricular_units_2nd_sem_without_evaluations": "HK2 – Học phần không đánh giá",
    "target": "Tình trạng học tập",
}

FIELD_GROUPS: Dict[str, List[str]] = {
    "personal": ["gender", "age_at_enrollment", "marital_status", "nationality",
                 "international", "displaced", "educational_special_needs"],
    "family": ["mothers_qualification", "fathers_qualification",
               "mothers_occupation", "fathers_occupation"],
    "admission": ["course", "daytime_evening_attendance", "application_mode",
                  "application_order", "previous_qualification",
                  "previous_qualification_grade", "admission_grade"],
    "financial": ["tuition_fees_up_to_date", "debtor", "scholarship_holder"],
    "macro": ["unemployment_rate", "inflation_rate", "gdp"],
    "semester_1": [f"curricular_units_1st_sem_{s}" for s in
                   ("credited", "enrolled", "evaluations", "approved", "grade", "without_evaluations")],
    "semester_2": [f"curricular_units_2nd_sem_{s}" for s in
                   ("credited", "enrolled", "evaluations", "approved", "grade", "without_evaluations")],
}

FIELD_RANGES: Dict[str, Dict[str, float]] = {
    "previous_qualification_grade": {"min": 0, "max": 200},
    "admission_grade": {"min": 0, "max": 200},
    "application_order": {"min": 0, "max": 9},
    "age_at_enrollment": {"min": 15, "max": 80},
    "curricular_units_1st_sem_grade": {"min": 0, "max": 20},
    "curricular_units_2nd_sem_grade": {"min": 0, "max": 20},
}

# Vietnamese labels for the most frequently displayed categorical fields.
# The remaining coded fields fall back to the official English UCI labels.
_VI_OPTIONS: Dict[str, Dict[int, str]] = {
    "course": {
        33: "Công nghệ sản xuất nhiên liệu sinh học",
        171: "Thiết kế hoạt hình & đa phương tiện",
        8014: "Công tác xã hội (buổi tối)",
        9003: "Nông học",
        9070: "Thiết kế truyền thông",
        9085: "Điều dưỡng thú y",
        9119: "Kỹ thuật tin học",
        9130: "Chăn nuôi ngựa",
        9147: "Quản trị kinh doanh",
        9238: "Công tác xã hội",
        9254: "Du lịch",
        9500: "Điều dưỡng",
        9556: "Vệ sinh răng miệng",
        9670: "Quản trị quảng cáo & marketing",
        9773: "Báo chí & truyền thông",
        9853: "Giáo dục cơ bản",
        9991: "Quản trị kinh doanh (buổi tối)",
    },
    "marital_status": {
        1: "Độc thân", 2: "Đã kết hôn", 3: "Góa", 4: "Ly hôn",
        5: "Sống chung không đăng ký", 6: "Ly thân",
    },
    "gender": {1: "Nam", 0: "Nữ"},
    "daytime_evening_attendance": {1: "Ban ngày", 0: "Buổi tối"},
    "tuition_fees_up_to_date": {1: "Đúng hạn", 0: "Chưa đóng"},
    "debtor": {1: "Có", 0: "Không"},
    "scholarship_holder": {1: "Có", 0: "Không"},
    "displaced": {1: "Có", 0: "Không"},
    "educational_special_needs": {1: "Có", 0: "Không"},
    "international": {1: "Có", 0: "Không"},
}

_CODE_LABEL_RE = re.compile(r"(\d+)\s*[–-]\s*(.+?)(?=\s+\d+\s*[–-]\s|;|$)")


def _to_snake(name: str) -> str:
    snake = re.sub(r"[^0-9a-zA-Z]+", "_", name.replace("'", "")).strip("_").lower()
    return {"nacionality": "nationality"}.get(snake, snake)


def _load_categorical_options() -> Dict[str, Dict[int, str]]:
    """Parse code -> label mappings from the official UCI metadata file."""
    options: Dict[str, Dict[int, str]] = {}
    try:
        meta = json.loads(_METADATA_PATH.read_text(encoding="utf-8"))
        for var in meta["data"]["variables"]:
            desc = (var.get("description") or "").strip()
            pairs = _CODE_LABEL_RE.findall(desc)
            if len(pairs) >= 2:
                options[_to_snake(var["name"])] = {
                    int(code): label.strip(" ;") for code, label in pairs
                }
    except (OSError, KeyError, ValueError):
        pass  # metadata missing -> fall back to Vietnamese labels only
    for field, vi_map in _VI_OPTIONS.items():
        options[field] = {**options.get(field, {}), **vi_map}
    return options


def _load_feature_sets() -> dict:
    try:
        return json.loads(_FEATURE_SETS_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


CATEGORICAL_OPTIONS = _load_categorical_options()
FEATURE_SETS = _load_feature_sets()


def label_of(field: str, code) -> Optional[str]:
    return CATEGORICAL_OPTIONS.get(field, {}).get(code)


# ==========================================
# Response / request schemas (kept local to avoid touching schemas.py)
# ==========================================
class OptionItem(BaseModel):
    value: int
    label: str


class FieldMeta(BaseModel):
    name: str
    label: str
    group: str
    type: Literal["int", "float", "binary", "categorical"]
    min: Optional[float] = None
    max: Optional[float] = None
    options: Optional[List[OptionItem]] = None


class MetaResponse(BaseModel):
    fields: List[FieldMeta]
    feature_sets: dict
    targets: List[str]
    risk_levels: List[str]
    stages: List[str]


class StudentListItem(BaseModel):
    student_code: str
    course: int
    course_name: Optional[str] = None
    gender: int
    age_at_enrollment: int
    daytime_evening_attendance: int
    admission_grade: float
    tuition_fees_up_to_date: int
    debtor: int
    scholarship_holder: int
    curricular_units_1st_sem_grade: float
    curricular_units_2nd_sem_grade: float
    curricular_units_1st_sem_approved: int
    curricular_units_2nd_sem_approved: int
    target: Optional[str] = None
    latest_risk_level: Optional[str] = None
    latest_risk_score: Optional[float] = None


class StudentPage(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[StudentListItem]


class SemesterSummary(BaseModel):
    enrolled: int
    approved: int
    credited: int
    evaluations: int
    without_evaluations: int
    grade: float
    approval_rate: Optional[float] = None


class PredictionOut(BaseModel):
    id: int
    student_code: str
    stage: str
    risk_score: float
    risk_level: str
    predicted_label: str
    evaluated_by: int
    evaluator_name: Optional[str] = None
    created_at: datetime


class StudentProfile(BaseModel):
    student: schemas.StudentOut
    labels: Dict[str, Optional[str]]
    semester_1: SemesterSummary
    semester_2: SemesterSummary
    latest_prediction: Optional[PredictionOut] = None
    prediction_count: int


class PredictionPage(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[PredictionOut]


class RiskFactor(BaseModel):
    key: str
    label: str
    value: Optional[float] = None
    weight: float          # contribution to the current risk score (0 for context-only)
    impact: Literal["increase", "decrease", "context"]
    description: str


class RiskExplanation(BaseModel):
    student_code: str
    stage: str
    base_score: float
    estimated_score: float
    risk_level: str
    factors: List[RiskFactor]
    suggestions: List[str]
    note: str


class OverviewStats(BaseModel):
    total_students: int
    by_target: Dict[str, int]
    target_rate: Dict[str, float]
    by_gender: Dict[str, int]
    by_attendance: Dict[str, int]
    financial: Dict[str, int]
    averages: Dict[str, Optional[float]]
    total_courses: int
    total_users: int
    predictions: Dict[str, object]


class GroupRateItem(BaseModel):
    value: int
    label: Optional[str] = None
    total: int
    counts: Dict[str, int]
    rates: Dict[str, float]


class HistogramBin(BaseModel):
    start: float
    end: float
    total: int
    counts: Dict[str, int]


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[Literal["Admin", "Academic Advisor"]] = None


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class StudentCreate(schemas.Semester2Features):
    student_code: Optional[str] = None  # auto-generated (SVxxxx) when omitted
    target: Optional[TargetLiteral] = None


StudentUpdate = create_model(
    "StudentUpdate",
    **{name: (Optional[field.annotation], None)
       for name, field in schemas.Semester2Features.model_fields.items()},
    target=(Optional[TargetLiteral], None),
)


# ==========================================
# Helpers
# ==========================================
def _pages(total: int, page_size: int) -> int:
    return (total + page_size - 1) // page_size if total else 0


def _latest_prediction_subquery(db: Session):
    """Sub-query containing the newest prediction row for each student."""
    latest_ids = db.query(func.max(PH.id).label("id")).group_by(PH.student_code).subquery()
    return db.query(PH).join(latest_ids, PH.id == latest_ids.c.id).subquery()


def _prediction_out(record: models.PredictionHistory, names: Dict[int, str]) -> PredictionOut:
    return PredictionOut(
        id=record.id,
        student_code=record.student_code,
        stage=record.stage,
        risk_score=record.risk_score,
        risk_level=record.risk_level,
        predicted_label=record.predicted_label,
        evaluated_by=record.evaluated_by,
        evaluator_name=names.get(record.evaluated_by),
        created_at=record.created_at,
    )


def _user_names(db: Session) -> Dict[int, str]:
    return {u.id: u.full_name for u in db.query(models.User.id, models.User.full_name)}


def _get_student_or_404(db: Session, student_code: str) -> models.Student:
    student = db.query(models.Student).filter(models.Student.student_code == student_code).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


def _semester_summary(student: models.Student, sem: str) -> SemesterSummary:
    def get(attr):
        return getattr(student, f"curricular_units_{sem}_sem_{attr}")
    enrolled = get("enrolled")
    approved = get("approved")
    return SemesterSummary(
        enrolled=enrolled,
        approved=approved,
        credited=get("credited"),
        evaluations=get("evaluations"),
        without_evaluations=get("without_evaluations"),
        grade=get("grade"),
        approval_rate=round(approved / enrolled, 4) if enrolled else None,
    )


def _student_labels(student: models.Student) -> Dict[str, Optional[str]]:
    return {
        field: label_of(field, getattr(student, field))
        for field in CATEGORICAL_OPTIONS
        if hasattr(student, field)
    }


def _risk_level(score: float) -> str:
    # Same thresholds as main.calculate_risk_and_save
    if score >= 0.70:
        return "High"
    if score >= 0.40:
        return "Medium"
    return "Low"


# ==========================================
# 1. METADATA API (dropdown options & form schema for the frontend)
# ==========================================
@router.get("/api/meta", response_model=MetaResponse, tags=["4. Metadata"])
def get_metadata(current_user: models.User = Depends(security.get_current_user)):
    """Field labels (Vietnamese), groups, ranges, dropdown options and feature sets."""
    fields: List[FieldMeta] = []
    for group, names in FIELD_GROUPS.items():
        for name in names:
            options = CATEGORICAL_OPTIONS.get(name)
            col_type = models.Student.__table__.columns[name].type.python_type
            if options and set(options) <= {0, 1}:
                ftype = "binary"
            elif options:
                ftype = "categorical"
            else:
                ftype = "float" if col_type is float else "int"
            fields.append(FieldMeta(
                name=name,
                label=FIELD_LABELS_VI.get(name, name),
                group=group,
                type=ftype,
                min=FIELD_RANGES.get(name, {}).get("min"),
                max=FIELD_RANGES.get(name, {}).get("max"),
                options=[OptionItem(value=k, label=v) for k, v in sorted(options.items())]
                if options else None,
            ))
    return MetaResponse(
        fields=fields,
        feature_sets=FEATURE_SETS,
        targets=TARGETS,
        risk_levels=["High", "Medium", "Low"],
        stages=["enrollment", "semester_1", "semester_2"],
    )


@router.get("/api/meta/options/{field}", response_model=List[OptionItem], tags=["4. Metadata"])
def get_field_options(field: str, current_user: models.User = Depends(security.get_current_user)):
    options = CATEGORICAL_OPTIONS.get(field)
    if options is None:
        raise HTTPException(status_code=404, detail="Field has no categorical options")
    return [OptionItem(value=k, label=v) for k, v in sorted(options.items())]


# ==========================================
# 2. DASHBOARD STATISTICS API
# ==========================================
@router.get("/api/stats/overview", response_model=OverviewStats, tags=["5. Statistics"])
def get_overview_stats(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.require_advisor_or_admin),
):
    S = models.Student
    total = db.query(func.count(S.id)).scalar() or 0

    by_target = {t: 0 for t in TARGETS}
    for target, count in db.query(S.target, func.count(S.id)).group_by(S.target):
        if target:
            by_target[target] = count

    by_gender = {label_of("gender", g) or str(g): c
                 for g, c in db.query(S.gender, func.count(S.id)).group_by(S.gender)}
    by_attendance = {label_of("daytime_evening_attendance", a) or str(a): c
                     for a, c in db.query(S.daytime_evening_attendance, func.count(S.id))
                     .group_by(S.daytime_evening_attendance)}

    financial = {
        "debtors": db.query(func.count(S.id)).filter(S.debtor == 1).scalar() or 0,
        "tuition_not_up_to_date": db.query(func.count(S.id)).filter(S.tuition_fees_up_to_date == 0).scalar() or 0,
        "scholarship_holders": db.query(func.count(S.id)).filter(S.scholarship_holder == 1).scalar() or 0,
        "international": db.query(func.count(S.id)).filter(S.international == 1).scalar() or 0,
    }

    avg_row = db.query(
        func.avg(S.age_at_enrollment), func.avg(S.admission_grade),
        func.avg(S.curricular_units_1st_sem_grade), func.avg(S.curricular_units_2nd_sem_grade),
    ).one()
    averages = {
        key: (round(val, 2) if val is not None else None)
        for key, val in zip(
            ["age_at_enrollment", "admission_grade", "semester_1_grade", "semester_2_grade"], avg_row
        )
    }

    latest = _latest_prediction_subquery(db)
    latest_by_level = {"High": 0, "Medium": 0, "Low": 0}
    for level, count in db.query(latest.c.risk_level, func.count()).group_by(latest.c.risk_level):
        latest_by_level[level] = count

    return OverviewStats(
        total_students=total,
        by_target=by_target,
        target_rate={t: round(c / total, 4) if total else 0.0 for t, c in by_target.items()},
        by_gender=by_gender,
        by_attendance=by_attendance,
        financial=financial,
        averages=averages,
        total_courses=db.query(func.count(func.distinct(S.course))).scalar() or 0,
        total_users=db.query(func.count(models.User.id)).scalar() or 0,
        predictions={
            "total_runs": db.query(func.count(PH.id)).scalar() or 0,
            "students_evaluated": db.query(func.count(func.distinct(PH.student_code))).scalar() or 0,
            "latest_by_risk_level": latest_by_level,
        },
    )


GROUPABLE_FIELDS = [
    "course", "gender", "marital_status", "daytime_evening_attendance", "application_mode",
    "previous_qualification", "nationality", "tuition_fees_up_to_date", "debtor",
    "scholarship_holder", "displaced", "international", "educational_special_needs",
    "application_order",
]


@router.get("/api/stats/group-by", response_model=List[GroupRateItem], tags=["5. Statistics"])
def get_target_rate_by_group(
    field: str = Query(..., description=f"One of: {', '.join(GROUPABLE_FIELDS)}"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.require_advisor_or_admin),
):
    """Dropout / Enrolled / Graduate counts and rates for each value of a categorical field."""
    if field not in GROUPABLE_FIELDS:
        raise HTTPException(status_code=400, detail=f"field must be one of {GROUPABLE_FIELDS}")
    column = getattr(models.Student, field)
    groups: Dict[int, Dict[str, int]] = {}
    for value, target, count in (
        db.query(column, models.Student.target, func.count(models.Student.id))
        .group_by(column, models.Student.target)
    ):
        groups.setdefault(value, {t: 0 for t in TARGETS})
        if target in TARGETS:
            groups[value][target] = count

    items = []
    for value, counts in groups.items():
        total = sum(counts.values())
        items.append(GroupRateItem(
            value=value,
            label=label_of(field, value),
            total=total,
            counts=counts,
            rates={t: round(c / total, 4) if total else 0.0 for t, c in counts.items()},
        ))
    return sorted(items, key=lambda item: item.total, reverse=True)


HISTOGRAM_FIELDS = {
    "age_at_enrollment": 5,
    "admission_grade": 10,
    "previous_qualification_grade": 10,
    "curricular_units_1st_sem_grade": 2,
    "curricular_units_2nd_sem_grade": 2,
    "curricular_units_1st_sem_approved": 2,
    "curricular_units_2nd_sem_approved": 2,
}


@router.get("/api/stats/histogram", response_model=List[HistogramBin], tags=["5. Statistics"])
def get_histogram(
    field: str = Query(..., description=f"One of: {', '.join(HISTOGRAM_FIELDS)}"),
    bin_width: Optional[float] = Query(None, gt=0),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.require_advisor_or_admin),
):
    """Distribution of a numeric field, split by target (for stacked bar charts)."""
    if field not in HISTOGRAM_FIELDS:
        raise HTTPException(status_code=400, detail=f"field must be one of {list(HISTOGRAM_FIELDS)}")
    width = bin_width or HISTOGRAM_FIELDS[field]
    column = getattr(models.Student, field)
    rows = db.query(column, models.Student.target).all()
    if not rows:
        return []

    low = min(r[0] for r in rows)
    start = (low // width) * width
    bins: Dict[int, Dict[str, int]] = {}
    for value, target in rows:
        idx = int((value - start) // width)
        bins.setdefault(idx, {t: 0 for t in TARGETS})
        if target in TARGETS:
            bins[idx][target] += 1

    return [
        HistogramBin(
            start=round(start + idx * width, 4),
            end=round(start + (idx + 1) * width, 4),
            total=sum(counts.values()),
            counts=counts,
        )
        for idx, counts in sorted(bins.items())
    ]


# ==========================================
# 3. STUDENT SEARCH, PROFILE & MANAGEMENT API
# ==========================================
SORTABLE_FIELDS = [
    "student_code", "age_at_enrollment", "admission_grade", "previous_qualification_grade",
    "curricular_units_1st_sem_grade", "curricular_units_2nd_sem_grade",
    "curricular_units_1st_sem_approved", "curricular_units_2nd_sem_approved", "course",
]


@router.get("/api/search/students", response_model=StudentPage, tags=["2. Students"])
def search_students(
    q: Optional[str] = Query(None, description="Partial student code or course name"),
    target: Optional[TargetLiteral] = None,
    course: Optional[int] = None,
    gender: Optional[int] = Query(None, ge=0, le=1),
    daytime_evening_attendance: Optional[int] = Query(None, ge=0, le=1),
    debtor: Optional[int] = Query(None, ge=0, le=1),
    tuition_fees_up_to_date: Optional[int] = Query(None, ge=0, le=1),
    scholarship_holder: Optional[int] = Query(None, ge=0, le=1),
    international: Optional[int] = Query(None, ge=0, le=1),
    min_age: Optional[int] = Query(None, ge=0),
    max_age: Optional[int] = Query(None, ge=0),
    risk_level: Optional[Literal["High", "Medium", "Low"]] = Query(
        None, description="Filter by the latest prediction risk level"
    ),
    sort_by: str = Query("student_code", description=f"One of: {', '.join(SORTABLE_FIELDS)}"),
    order: Literal["asc", "desc"] = "asc",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.require_advisor_or_admin),
):
    """Paginated student search with filters, sorting and total count."""
    S = models.Student
    if sort_by not in SORTABLE_FIELDS:
        raise HTTPException(status_code=400, detail=f"sort_by must be one of {SORTABLE_FIELDS}")

    query = db.query(S)
    if q:
        term = q.strip()
        matching_courses = [code for code, name in CATEGORICAL_OPTIONS.get("course", {}).items()
                            if term.lower() in name.lower()]
        conditions = [S.student_code.ilike(f"%{term}%")]
        if matching_courses:
            conditions.append(S.course.in_(matching_courses))
        query = query.filter(or_(*conditions))

    exact_filters = {
        "target": target, "course": course, "gender": gender,
        "daytime_evening_attendance": daytime_evening_attendance, "debtor": debtor,
        "tuition_fees_up_to_date": tuition_fees_up_to_date,
        "scholarship_holder": scholarship_holder, "international": international,
    }
    for field, value in exact_filters.items():
        if value is not None:
            query = query.filter(getattr(S, field) == value)
    if min_age is not None:
        query = query.filter(S.age_at_enrollment >= min_age)
    if max_age is not None:
        query = query.filter(S.age_at_enrollment <= max_age)

    if risk_level:
        latest = _latest_prediction_subquery(db)
        query = query.join(latest, latest.c.student_code == S.student_code) \
                     .filter(latest.c.risk_level == risk_level)

    total = query.count()
    sort_column = getattr(S, sort_by)
    query = query.order_by(sort_column.desc() if order == "desc" else sort_column.asc(), S.id)
    students = query.offset((page - 1) * page_size).limit(page_size).all()

    codes = [s.student_code for s in students]
    latest_map: Dict[str, models.PredictionHistory] = {}
    if codes:
        for rec in db.query(PH).filter(PH.student_code.in_(codes)).order_by(PH.id):
            latest_map[rec.student_code] = rec  # last one wins -> newest

    items = []
    for s in students:
        pred = latest_map.get(s.student_code)
        items.append(StudentListItem(
            student_code=s.student_code,
            course=s.course,
            course_name=label_of("course", s.course),
            gender=s.gender,
            age_at_enrollment=s.age_at_enrollment,
            daytime_evening_attendance=s.daytime_evening_attendance,
            admission_grade=s.admission_grade,
            tuition_fees_up_to_date=s.tuition_fees_up_to_date,
            debtor=s.debtor,
            scholarship_holder=s.scholarship_holder,
            curricular_units_1st_sem_grade=s.curricular_units_1st_sem_grade,
            curricular_units_2nd_sem_grade=s.curricular_units_2nd_sem_grade,
            curricular_units_1st_sem_approved=s.curricular_units_1st_sem_approved,
            curricular_units_2nd_sem_approved=s.curricular_units_2nd_sem_approved,
            target=s.target,
            latest_risk_level=pred.risk_level if pred else None,
            latest_risk_score=pred.risk_score if pred else None,
        ))

    return StudentPage(
        total=total, page=page, page_size=page_size,
        total_pages=_pages(total, page_size), items=items,
    )


@router.get("/api/students/{student_code}/profile", response_model=StudentProfile, tags=["2. Students"])
def get_student_profile(
    student_code: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.require_advisor_or_admin),
):
    """Full student record + readable labels + semester summaries + latest prediction."""
    student = _get_student_or_404(db, student_code)
    predictions = db.query(PH).filter(PH.student_code == student_code)
    latest = predictions.order_by(PH.id.desc()).first()
    return StudentProfile(
        student=schemas.StudentOut.model_validate(student),
        labels=_student_labels(student),
        semester_1=_semester_summary(student, "1st"),
        semester_2=_semester_summary(student, "2nd"),
        latest_prediction=_prediction_out(latest, _user_names(db)) if latest else None,
        prediction_count=predictions.count(),
    )


@router.get("/api/students/{student_code}/predictions", response_model=List[PredictionOut],
            tags=["3. Risk Prediction"])
def get_student_predictions(
    student_code: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.require_advisor_or_admin),
):
    """Prediction history of one student, newest first."""
    _get_student_or_404(db, student_code)
    names = _user_names(db)
    records = db.query(PH).filter(PH.student_code == student_code).order_by(PH.id.desc()).all()
    return [_prediction_out(r, names) for r in records]


@router.get("/api/students/{student_code}/risk-factors", response_model=RiskExplanation,
            tags=["3. Risk Prediction"])
def explain_student_risk(
    student_code: str,
    stage: Literal["enrollment", "semester_1", "semester_2"] = "semester_2",
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.require_advisor_or_admin),
):
    """
    Explain which factors drive the risk score of a student (read-only, nothing is saved).

    The weighted factors mirror the temporary rule in `main.calculate_risk_and_save`.
    When the ML model is plugged in, replace this logic with feature importances / SHAP.
    """
    s = _get_student_or_404(db, student_code)
    base = 0.15
    factors: List[RiskFactor] = []

    def add(key, value, weight, impact, description):
        factors.append(RiskFactor(key=key, label=FIELD_LABELS_VI.get(key, key), value=value,
                                  weight=weight, impact=impact, description=description))

    # --- Weighted factors (same rule as main.py) ---
    if s.tuition_fees_up_to_date == 0:
        add("tuition_fees_up_to_date", 0, 0.35, "increase",
            "Chưa đóng học phí đúng hạn (nhóm này có tỷ lệ bỏ học ~86.6%).")
    if s.debtor == 1:
        add("debtor", 1, 0.20, "increase", "Sinh viên đang có nợ (tỷ lệ bỏ học ~62.0%).")
    if stage in ("semester_1", "semester_2") and s.curricular_units_1st_sem_grade < 10:
        add("curricular_units_1st_sem_grade", s.curricular_units_1st_sem_grade, 0.25, "increase",
            "Điểm trung bình học kỳ 1 dưới 10/20.")

    # --- Context-only factors (not part of the score, shown to help advisors) ---
    if s.scholarship_holder == 1:
        add("scholarship_holder", 1, 0.0, "decrease",
            "Có học bổng (tỷ lệ bỏ học ~12.2% so với 38.7%).")
    if s.age_at_enrollment >= 25:
        add("age_at_enrollment", s.age_at_enrollment, 0.0, "context",
            "Nhập học ở độ tuổi lớn (nhóm Dropout có tuổi trung bình ~26).")
    if stage in ("semester_1", "semester_2") and s.curricular_units_1st_sem_enrolled:
        rate = s.curricular_units_1st_sem_approved / s.curricular_units_1st_sem_enrolled
        if rate < 0.5:
            add("curricular_units_1st_sem_approved", s.curricular_units_1st_sem_approved, 0.0,
                "context", f"Chỉ đạt {rate:.0%} số học phần đăng ký ở học kỳ 1.")
    if stage == "semester_2" and s.curricular_units_2nd_sem_enrolled:
        rate = s.curricular_units_2nd_sem_approved / s.curricular_units_2nd_sem_enrolled
        if rate < 0.5:
            add("curricular_units_2nd_sem_approved", s.curricular_units_2nd_sem_approved, 0.0,
                "context", f"Chỉ đạt {rate:.0%} số học phần đăng ký ở học kỳ 2.")

    score = min(round(base + sum(f.weight for f in factors), 2), 0.99)

    suggestions = []
    keys = {f.key for f in factors}
    if "tuition_fees_up_to_date" in keys or "debtor" in keys:
        suggestions.append("Liên hệ phòng Tài chính để hỗ trợ gia hạn / trả góp học phí.")
        suggestions.append("Giới thiệu các chương trình học bổng, hỗ trợ tài chính.")
    if keys & {"curricular_units_1st_sem_grade", "curricular_units_1st_sem_approved",
               "curricular_units_2nd_sem_approved"}:
        suggestions.append("Đặt lịch gặp cố vấn học tập, xem xét giảm tải số học phần.")
        suggestions.append("Giới thiệu lớp phụ đạo / nhóm học tập.")
    if not suggestions:
        suggestions.append("Tiếp tục theo dõi định kỳ.")

    return RiskExplanation(
        student_code=student_code,
        stage=stage,
        base_score=base,
        estimated_score=score,
        risk_level=_risk_level(score),
        factors=factors,
        suggestions=suggestions,
        note="Rule-based explanation (temporary). Will be replaced by ML feature importances.",
    )


@router.post("/api/students", response_model=schemas.StudentOut, status_code=status.HTTP_201_CREATED,
             tags=["2. Students"])
def create_student(
    payload: StudentCreate,
    db: Session = Depends(database.get_db),
    admin_user: models.User = Depends(security.require_admin),
):
    """Create a new student record (Admin only). Code is auto-generated if omitted."""
    data = payload.model_dump()
    code = data.pop("student_code")
    if code:
        if db.query(models.Student).filter(models.Student.student_code == code).first():
            raise HTTPException(status_code=400, detail="Student code already exists")
    else:
        next_number = (db.query(func.max(models.Student.id)).scalar() or 0) + 1
        code = f"SV{next_number:04d}"
        while db.query(models.Student).filter(models.Student.student_code == code).first():
            next_number += 1
            code = f"SV{next_number:04d}"
    student = models.Student(student_code=code, **data)
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.put("/api/students/{student_code}", response_model=schemas.StudentOut, tags=["2. Students"])
def update_student(
    student_code: str,
    payload: StudentUpdate,
    db: Session = Depends(database.get_db),
    admin_user: models.User = Depends(security.require_admin),
):
    """Partially update a student record (Admin only). Only sent fields are changed."""
    student = _get_student_or_404(db, student_code)
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is None and field != "target":
            raise HTTPException(status_code=400, detail=f"{field} cannot be null")
        setattr(student, field, value)
    db.commit()
    db.refresh(student)
    return student


# ==========================================
# 4. PREDICTION HISTORY (paginated & filterable)
# ==========================================
@router.get("/api/predictions", response_model=PredictionPage, tags=["3. Risk Prediction"])
def list_predictions(
    student_code: Optional[str] = Query(None, description="Partial student code"),
    stage: Optional[Literal["enrollment", "semester_1", "semester_2"]] = None,
    risk_level: Optional[Literal["High", "Medium", "Low"]] = None,
    evaluated_by: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.require_advisor_or_admin),
):
    query = db.query(PH)
    if student_code:
        query = query.filter(PH.student_code.ilike(f"%{student_code.strip()}%"))
    if stage:
        query = query.filter(PH.stage == stage)
    if risk_level:
        query = query.filter(PH.risk_level == risk_level)
    if evaluated_by is not None:
        query = query.filter(PH.evaluated_by == evaluated_by)

    total = query.count()
    records = query.order_by(PH.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    names = _user_names(db)
    return PredictionPage(
        total=total, page=page, page_size=page_size, total_pages=_pages(total, page_size),
        items=[_prediction_out(r, names) for r in records],
    )


# ==========================================
# 5. ACCOUNT MANAGEMENT (complements the existing /api/users endpoints)
# ==========================================
@router.post("/api/auth/change-password", tags=["1. Auth & Authorization"])
def change_my_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if not security.verify_password(payload.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Old password is incorrect")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    user.hashed_password = security.hash_password(payload.new_password)
    db.commit()
    return {"detail": "Password changed successfully"}


@router.put("/api/users/{user_id}", response_model=schemas.UserOut, tags=["1. Auth & Authorization"])
def update_user_by_admin(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(database.get_db),
    admin_user: models.User = Depends(security.require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin_user.id and payload.role and payload.role != "Admin":
        raise HTTPException(status_code=400, detail="You cannot remove your own Admin role")
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.role is not None:
        user.role = payload.role
    if payload.password:
        user.hashed_password = security.hash_password(payload.password)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/api/users/{user_id}", tags=["1. Auth & Authorization"])
def delete_user_by_admin(
    user_id: int,
    db: Session = Depends(database.get_db),
    admin_user: models.User = Depends(security.require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    if db.query(PH).filter(PH.evaluated_by == user.id).first():
        raise HTTPException(
            status_code=409,
            detail="User has prediction history; change their role instead of deleting",
        )
    db.delete(user)
    db.commit()
    return {"detail": f"User '{user.username}' deleted"}

