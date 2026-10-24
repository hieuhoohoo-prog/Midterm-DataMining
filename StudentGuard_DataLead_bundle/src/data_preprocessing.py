"""Reproducible data preparation and EDA for the StudentGuard project.

The script treats ``data/raw/data.csv`` as immutable input. It verifies the
official UCI file checksum, normalizes column names, performs documented data
quality checks, writes the shared clean CSV and feature sets, and regenerates
the data documentation and EDA figures.

No one-hot encoding, scaling, imputation, feature selection, or resampling is
performed here. Those operations belong inside the ML training pipeline after
the train/validation/test split.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
from pathlib import Path
from typing import Iterable, Mapping, Sequence

import numpy as np
import pandas as pd
from PIL import Image, ImageDraw, ImageFont


PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_CSV = PROJECT_ROOT / "data" / "raw" / "data.csv"
RAW_METADATA = PROJECT_ROOT / "data" / "raw" / "uci_dataset_697_metadata.json"
PROCESSED_CSV = PROJECT_ROOT / "data" / "processed" / "student_dropout_clean.csv"
FEATURE_SETS_JSON = PROJECT_ROOT / "data" / "processed" / "feature_sets.json"
DATA_DICTIONARY = PROJECT_ROOT / "docs" / "data_dictionary.md"
EDA_SUMMARY = PROJECT_ROOT / "docs" / "eda_summary.md"
README_DATA = PROJECT_ROOT / "README_data.md"
FIGURES_DIR = PROJECT_ROOT / "outputs" / "figures"
QUALITY_REPORT = PROJECT_ROOT / "outputs" / "quality_report.json"

EXPECTED_RAW_SHA256 = "3ef126de5cefff26eb11fbb4237f1a1401cb64b488e2f1d598c23cedeb4c45ae"
UCI_DATASET_URL = (
    "https://archive.ics.uci.edu/dataset/697/"
    "predict+students+dropout+and+academic+success"
)
UCI_DOI_URL = "https://doi.org/10.24432/C5MC89"

RAW_TO_CLEAN = {
    "Marital status": "marital_status",
    "Application mode": "application_mode",
    "Application order": "application_order",
    "Course": "course",
    "Daytime/evening attendance": "daytime_evening_attendance",
    "Previous qualification": "previous_qualification",
    "Previous qualification (grade)": "previous_qualification_grade",
    "Nacionality": "nationality",
    "Mother's qualification": "mothers_qualification",
    "Father's qualification": "fathers_qualification",
    "Mother's occupation": "mothers_occupation",
    "Father's occupation": "fathers_occupation",
    "Admission grade": "admission_grade",
    "Displaced": "displaced",
    "Educational special needs": "educational_special_needs",
    "Debtor": "debtor",
    "Tuition fees up to date": "tuition_fees_up_to_date",
    "Gender": "gender",
    "Scholarship holder": "scholarship_holder",
    "Age at enrollment": "age_at_enrollment",
    "International": "international",
    "Curricular units 1st sem (credited)": "curricular_units_1st_sem_credited",
    "Curricular units 1st sem (enrolled)": "curricular_units_1st_sem_enrolled",
    "Curricular units 1st sem (evaluations)": "curricular_units_1st_sem_evaluations",
    "Curricular units 1st sem (approved)": "curricular_units_1st_sem_approved",
    "Curricular units 1st sem (grade)": "curricular_units_1st_sem_grade",
    "Curricular units 1st sem (without evaluations)": "curricular_units_1st_sem_without_evaluations",
    "Curricular units 2nd sem (credited)": "curricular_units_2nd_sem_credited",
    "Curricular units 2nd sem (enrolled)": "curricular_units_2nd_sem_enrolled",
    "Curricular units 2nd sem (evaluations)": "curricular_units_2nd_sem_evaluations",
    "Curricular units 2nd sem (approved)": "curricular_units_2nd_sem_approved",
    "Curricular units 2nd sem (grade)": "curricular_units_2nd_sem_grade",
    "Curricular units 2nd sem (without evaluations)": "curricular_units_2nd_sem_without_evaluations",
    "Unemployment rate": "unemployment_rate",
    "Inflation rate": "inflation_rate",
    "GDP": "gdp",
    "Target": "target",
}

ENROLLMENT_FEATURES = [
    "marital_status",
    "application_mode",
    "application_order",
    "course",
    "daytime_evening_attendance",
    "previous_qualification",
    "previous_qualification_grade",
    "nationality",
    "mothers_qualification",
    "fathers_qualification",
    "mothers_occupation",
    "fathers_occupation",
    "admission_grade",
    "displaced",
    "educational_special_needs",
    "debtor",
    "tuition_fees_up_to_date",
    "gender",
    "scholarship_holder",
    "age_at_enrollment",
    "international",
    "unemployment_rate",
    "inflation_rate",
    "gdp",
]

SEMESTER_1_ADDITIONS = [
    "curricular_units_1st_sem_credited",
    "curricular_units_1st_sem_enrolled",
    "curricular_units_1st_sem_evaluations",
    "curricular_units_1st_sem_approved",
    "curricular_units_1st_sem_grade",
    "curricular_units_1st_sem_without_evaluations",
]

SEMESTER_2_ADDITIONS = [
    "curricular_units_2nd_sem_credited",
    "curricular_units_2nd_sem_enrolled",
    "curricular_units_2nd_sem_evaluations",
    "curricular_units_2nd_sem_approved",
    "curricular_units_2nd_sem_grade",
    "curricular_units_2nd_sem_without_evaluations",
]

OUTLIER_ANALYSIS_COLUMNS = [
    "application_order",
    "previous_qualification_grade",
    "admission_grade",
    "age_at_enrollment",
    *SEMESTER_1_ADDITIONS,
    *SEMESTER_2_ADDITIONS,
    "unemployment_rate",
    "inflation_rate",
    "gdp",
]

FEATURE_SETS = {
    "enrollment_features": ENROLLMENT_FEATURES,
    "semester_1_features": ENROLLMENT_FEATURES + SEMESTER_1_ADDITIONS,
    "semester_2_features": ENROLLMENT_FEATURES + SEMESTER_1_ADDITIONS + SEMESTER_2_ADDITIONS,
}

FEATURE_GROUP = {
    "marital_status": "enrollment_demographic",
    "application_mode": "enrollment_application",
    "application_order": "enrollment_application",
    "course": "enrollment_application",
    "daytime_evening_attendance": "enrollment_application",
    "previous_qualification": "enrollment_academic_history",
    "previous_qualification_grade": "enrollment_academic_history",
    "nationality": "enrollment_demographic",
    "mothers_qualification": "enrollment_demographic",
    "fathers_qualification": "enrollment_demographic",
    "mothers_occupation": "enrollment_demographic",
    "fathers_occupation": "enrollment_demographic",
    "admission_grade": "enrollment_academic_history",
    "displaced": "enrollment_demographic",
    "educational_special_needs": "enrollment_demographic",
    "debtor": "enrollment_financial",
    "tuition_fees_up_to_date": "enrollment_financial",
    "gender": "enrollment_demographic",
    "scholarship_holder": "enrollment_financial",
    "age_at_enrollment": "enrollment_demographic",
    "international": "enrollment_demographic",
    **{column: "semester_1_academic" for column in SEMESTER_1_ADDITIONS},
    **{column: "semester_2_academic" for column in SEMESTER_2_ADDITIONS},
    "unemployment_rate": "enrollment_macro_context",
    "inflation_rate": "enrollment_macro_context",
    "gdp": "enrollment_macro_context",
    "target": "target",
}

VIETNAMESE_MEANING = {
    "marital_status": "Tình trạng hôn nhân tại thời điểm nhập học (mã phân loại UCI).",
    "application_mode": "Phương thức hoặc diện tuyển sinh (mã phân loại UCI).",
    "application_order": "Thứ tự nguyện vọng, từ 0 là nguyện vọng đầu đến 9 là cuối.",
    "course": "Chương trình/ngành học sinh viên đăng ký (mã khóa học UCI).",
    "daytime_evening_attendance": "Hình thức học: 1 ban ngày, 0 buổi tối.",
    "previous_qualification": "Bằng cấp/trình độ trước khi nhập học (mã phân loại UCI).",
    "previous_qualification_grade": "Điểm của bằng cấp trước đó, thang 0–200.",
    "nationality": "Quốc tịch (cột gốc UCI viết là `Nacionality`; giá trị là mã phân loại).",
    "mothers_qualification": "Trình độ học vấn của mẹ (mã phân loại UCI).",
    "fathers_qualification": "Trình độ học vấn của cha (mã phân loại UCI).",
    "mothers_occupation": "Nghề nghiệp của mẹ (mã phân loại UCI; mã 99 là nhóm `(blank)` theo metadata, không phải NA).",
    "fathers_occupation": "Nghề nghiệp của cha (mã phân loại UCI; mã 99 là nhóm `(blank)` theo metadata, không phải NA).",
    "admission_grade": "Điểm đầu vào, thang 0–200.",
    "displaced": "Sinh viên học xa nơi cư trú: 1 có, 0 không.",
    "educational_special_needs": "Có nhu cầu giáo dục đặc biệt: 1 có, 0 không.",
    "debtor": "Có tình trạng nợ: 1 có, 0 không.",
    "tuition_fees_up_to_date": "Học phí đã được thanh toán đúng hạn: 1 có, 0 không.",
    "gender": "Giới tính theo mã nguồn: 1 nam, 0 nữ.",
    "scholarship_holder": "Có học bổng: 1 có, 0 không.",
    "age_at_enrollment": "Tuổi tại thời điểm nhập học.",
    "international": "Sinh viên quốc tế: 1 có, 0 không.",
    "curricular_units_1st_sem_credited": "Số học phần được công nhận/chuyển đổi trong học kỳ 1.",
    "curricular_units_1st_sem_enrolled": "Số học phần đăng ký trong học kỳ 1.",
    "curricular_units_1st_sem_evaluations": "Số lượt đánh giá/thi của học phần trong học kỳ 1.",
    "curricular_units_1st_sem_approved": "Số học phần đạt trong học kỳ 1.",
    "curricular_units_1st_sem_grade": "Điểm trung bình học kỳ 1, thang 0–20.",
    "curricular_units_1st_sem_without_evaluations": "Số học phần không có đánh giá trong học kỳ 1.",
    "curricular_units_2nd_sem_credited": "Số học phần được công nhận/chuyển đổi trong học kỳ 2.",
    "curricular_units_2nd_sem_enrolled": "Số học phần đăng ký trong học kỳ 2.",
    "curricular_units_2nd_sem_evaluations": "Số lượt đánh giá/thi của học phần trong học kỳ 2.",
    "curricular_units_2nd_sem_approved": "Số học phần đạt trong học kỳ 2.",
    "curricular_units_2nd_sem_grade": "Điểm trung bình học kỳ 2, thang 0–20.",
    "curricular_units_2nd_sem_without_evaluations": "Số học phần không có đánh giá trong học kỳ 2 (metadata UCI ghi nhầm học kỳ 1).",
    "unemployment_rate": "Tỷ lệ thất nghiệp (%) trong bối cảnh kinh tế liên quan.",
    "inflation_rate": "Tỷ lệ lạm phát (%) trong bối cảnh kinh tế liên quan.",
    "gdp": "Chỉ số/tăng trưởng GDP trong bối cảnh kinh tế liên quan.",
    "target": "Kết quả cuối thời gian chuẩn của khóa học: Dropout, Enrolled hoặc Graduate.",
}

TARGET_ORDER = ["Dropout", "Enrolled", "Graduate"]
TARGET_COLORS = {"Dropout": "#D1495B", "Enrolled": "#F4A261", "Graduate": "#3A7D44"}
BACKGROUND = "#F7F9FC"
CARD = "#FFFFFF"
INK = "#243447"
MUTED = "#607080"
GRID = "#DCE3EA"
BLUE = "#2F6690"
OUTLIER_LABELS = {
    "application_order": "Application\norder",
    "previous_qualification_grade": "Previous qual.\ngrade",
    "admission_grade": "Admission\ngrade",
    "age_at_enrollment": "Age at\nenrollment",
    "curricular_units_1st_sem_credited": "Sem 1\ncredited",
    "curricular_units_1st_sem_enrolled": "Sem 1\nenrolled",
    "curricular_units_1st_sem_evaluations": "Sem 1\nevaluations",
    "curricular_units_1st_sem_approved": "Sem 1\napproved",
    "curricular_units_1st_sem_grade": "Sem 1\ngrade",
    "curricular_units_1st_sem_without_evaluations": "Sem 1 no\nevaluation",
    "curricular_units_2nd_sem_credited": "Sem 2\ncredited",
    "curricular_units_2nd_sem_enrolled": "Sem 2\nenrolled",
    "curricular_units_2nd_sem_evaluations": "Sem 2\nevaluations",
    "curricular_units_2nd_sem_approved": "Sem 2\napproved",
    "curricular_units_2nd_sem_grade": "Sem 2\ngrade",
    "curricular_units_2nd_sem_without_evaluations": "Sem 2 no\nevaluation",
    "unemployment_rate": "Unemployment\nrate",
    "inflation_rate": "Inflation\nrate",
    "gdp": "GDP",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def strip_header(value: object) -> str:
    return str(value).replace("\ufeff", "").strip()


def load_source() -> tuple[pd.DataFrame, dict]:
    if not RAW_CSV.exists():
        raise FileNotFoundError(f"Missing official raw file: {RAW_CSV}")
    if not RAW_METADATA.exists():
        raise FileNotFoundError(f"Missing official UCI metadata: {RAW_METADATA}")
    actual_hash = sha256(RAW_CSV)
    if actual_hash.lower() != EXPECTED_RAW_SHA256:
        raise ValueError(
            "Raw file checksum differs from the verified UCI artifact. "
            f"Expected {EXPECTED_RAW_SHA256}, got {actual_hash}."
        )
    raw = pd.read_csv(RAW_CSV, sep=";")
    raw.columns = [strip_header(column) for column in raw.columns]
    expected = list(RAW_TO_CLEAN)
    if raw.columns.tolist() != expected:
        raise ValueError(
            "Unexpected raw schema after whitespace cleanup.\n"
            f"Expected: {expected}\nObserved: {raw.columns.tolist()}"
        )
    metadata = json.loads(RAW_METADATA.read_text(encoding="utf-8"))
    return raw, metadata


def build_clean_data(raw: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    clean = raw.rename(columns=RAW_TO_CLEAN).copy()
    clean["target"] = clean["target"].astype("string").str.strip()
    for column in clean.columns.drop("target"):
        clean[column] = pd.to_numeric(clean[column], errors="raise")
    duplicate_count = int(clean.duplicated().sum())
    if duplicate_count:
        clean = clean.drop_duplicates(keep="first").reset_index(drop=True)
    return clean, duplicate_count


def metadata_lookup(metadata: dict) -> dict[str, dict]:
    variables = metadata["data"]["variables"]
    return {strip_header(item["name"]).casefold(): item for item in variables}


def codes_from_description(description: str | None) -> set[int]:
    if not description:
        return set()
    return {int(code) for code in re.findall(r"(?:^|[;\s])(\d+)\s*[–-]\s*", description)}


def validate_data(clean: pd.DataFrame, metadata: dict) -> tuple[dict[str, int], dict[str, int]]:
    errors: dict[str, int] = {}
    warnings: dict[str, int] = {}

    errors["missing_cells"] = int(clean.isna().sum().sum())
    errors["invalid_target"] = int((~clean["target"].isin(TARGET_ORDER)).sum())

    lookup = metadata_lookup(metadata)
    coded_raw_columns = [
        "Marital status",
        "Application mode",
        "Course",
        "Daytime/evening attendance",
        "Previous qualification",
        "Nacionality",
        "Mother's qualification",
        "Father's qualification",
        "Mother's occupation",
        "Father's occupation",
        "Displaced",
        "Educational special needs",
        "Debtor",
        "Tuition fees up to date",
        "Gender",
        "Scholarship holder",
        "International",
    ]
    for raw_name in coded_raw_columns:
        item = lookup.get(raw_name.casefold())
        if item is None:
            raise KeyError(f"Metadata description not found for {raw_name}")
        allowed = codes_from_description(item.get("description"))
        clean_name = RAW_TO_CLEAN[raw_name]
        if not allowed:
            raise ValueError(f"Could not parse valid codes for {raw_name}")
        errors[f"invalid_code:{clean_name}"] = int((~clean[clean_name].isin(allowed)).sum())

    range_rules = {
        "application_order": (0, 9),
        "previous_qualification_grade": (0, 200),
        "admission_grade": (0, 200),
        "age_at_enrollment": (15, 100),
        "curricular_units_1st_sem_grade": (0, 20),
        "curricular_units_2nd_sem_grade": (0, 20),
    }
    for column, (lower, upper) in range_rules.items():
        errors[f"out_of_range:{column}"] = int(((clean[column] < lower) | (clean[column] > upper)).sum())

    count_columns = [column for column in clean.columns if column.startswith("curricular_units_") and not column.endswith("_grade")]
    for column in count_columns:
        errors[f"negative_count:{column}"] = int((clean[column] < 0).sum())
        errors[f"non_integer_count:{column}"] = int((clean[column] % 1 != 0).sum())

    for semester in ("1st", "2nd"):
        enrolled = f"curricular_units_{semester}_sem_enrolled"
        approved = f"curricular_units_{semester}_sem_approved"
        credited = f"curricular_units_{semester}_sem_credited"
        without_eval = f"curricular_units_{semester}_sem_without_evaluations"
        grade = f"curricular_units_{semester}_sem_grade"
        errors[f"approved_exceeds_enrolled:{semester}_sem"] = int((clean[approved] > clean[enrolled]).sum())
        errors[f"credited_exceeds_enrolled:{semester}_sem"] = int((clean[credited] > clean[enrolled]).sum())
        warnings[f"without_evaluations_exceeds_enrolled:{semester}_sem"] = int(
            (clean[without_eval] > clean[enrolled]).sum()
        )
        warnings[f"positive_grade_with_zero_approved:{semester}_sem"] = int(
            ((clean[grade] > 0) & (clean[approved] == 0)).sum()
        )
        warnings[f"zero_grade_with_positive_approved:{semester}_sem"] = int(
            ((clean[grade] == 0) & (clean[approved] > 0)).sum()
        )

    nonzero_errors = {key: value for key, value in errors.items() if value}
    if nonzero_errors:
        raise ValueError(f"Blocking data-quality errors found: {nonzero_errors}")
    return errors, warnings


def validate_feature_sets(columns: Iterable[str]) -> None:
    column_set = set(columns)
    if any("target" in features for features in FEATURE_SETS.values()):
        raise AssertionError("Target must not be present in any feature set")
    if any("1st_sem" in feature or "2nd_sem" in feature for feature in ENROLLMENT_FEATURES):
        raise AssertionError("Enrollment features contain post-enrollment academic data")
    if not set(FEATURE_SETS["enrollment_features"]).issubset(FEATURE_SETS["semester_1_features"]):
        raise AssertionError("Semester 1 feature set is not cumulative")
    if not set(FEATURE_SETS["semester_1_features"]).issubset(FEATURE_SETS["semester_2_features"]):
        raise AssertionError("Semester 2 feature set is not cumulative")
    expected_features = column_set - {"target"}
    observed_features = set(FEATURE_SETS["semester_2_features"])
    if expected_features != observed_features:
        raise AssertionError(
            f"Feature coverage mismatch. Missing={expected_features-observed_features}; "
            f"extra={observed_features-expected_features}"
        )


def iqr_outlier_counts(clean: pd.DataFrame) -> dict[str, int]:
    counts: dict[str, int] = {}
    # Exclude nominal category codes and binary flags: applying IQR to those
    # fields would incorrectly label valid minority categories as outliers.
    for column in OUTLIER_ANALYSIS_COLUMNS:
        q1 = float(clean[column].quantile(0.25))
        q3 = float(clean[column].quantile(0.75))
        iqr = q3 - q1
        if iqr == 0:
            counts[column] = int(((clean[column] < q1) | (clean[column] > q3)).sum())
        else:
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr
            counts[column] = int(((clean[column] < lower) | (clean[column] > upper)).sum())
    return counts


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "arialbd.ttf" if bold else "arial.ttf",
        "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def base_image(title: str, subtitle: str = "") -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (1400, 820), BACKGROUND)
    draw = ImageDraw.Draw(image)
    draw.text((70, 42), title, fill=INK, font=font(32, bold=True))
    if subtitle:
        draw.text((70, 88), subtitle, fill=MUTED, font=font(18))
    return image, draw


def nice_upper(value: float) -> float:
    if value <= 0:
        return 1.0
    raw_step = value / 5
    magnitude = 10 ** math.floor(math.log10(raw_step))
    fraction = raw_step / magnitude
    if fraction <= 1:
        nice_fraction = 1
    elif fraction <= 2:
        nice_fraction = 2
    elif fraction <= 2.5:
        nice_fraction = 2.5
    elif fraction <= 5:
        nice_fraction = 5
    else:
        nice_fraction = 10
    return nice_fraction * magnitude * 5


def draw_bar_chart(
    labels: Sequence[str],
    values: Sequence[float],
    title: str,
    subtitle: str,
    output: Path,
    colors: Sequence[str] | None = None,
    percent: bool = False,
) -> None:
    image, draw = base_image(title, subtitle)
    left, top, right, bottom = 115, 165, 1340, 715
    max_value = max(values) if values else 1
    axis_max = 100 if percent else nice_upper(max_value * 1.12)
    for tick in range(6):
        value = axis_max * tick / 5
        y = bottom - (bottom - top) * tick / 5
        draw.line((left, y, right, y), fill=GRID, width=2)
        label = f"{value:.0f}%" if percent else f"{value:,.0f}"
        draw.text((left - 18, y), label, fill=MUTED, font=font(15), anchor="rm")
    gap = 26
    slot = (right - left) / max(len(labels), 1)
    bar_width = max(22, slot - gap)
    for index, (label, value) in enumerate(zip(labels, values)):
        x0 = left + index * slot + (slot - bar_width) / 2
        x1 = x0 + bar_width
        y0 = bottom - (value / axis_max) * (bottom - top)
        color = colors[index] if colors else BLUE
        draw.rounded_rectangle((x0, y0, x1, bottom), radius=8, fill=color)
        value_label = f"{value:.1f}%" if percent else f"{value:,.0f}"
        draw.text(((x0 + x1) / 2, y0 - 12), value_label, fill=INK, font=font(17, bold=True), anchor="mb")
        wrapped = label if "\n" in label else label.replace(" ", "\n", 1) if len(label) > 16 else label
        draw.multiline_text(((x0 + x1) / 2, bottom + 18), wrapped, fill=INK, font=font(15), anchor="ma", align="center", spacing=3)
    draw.line((left, bottom, right, bottom), fill=INK, width=2)
    image.save(output, format="PNG", optimize=True)


def draw_grouped_bars(
    categories: Sequence[str],
    series: Mapping[str, Sequence[float]],
    title: str,
    subtitle: str,
    output: Path,
    ylabel: str,
) -> None:
    image, draw = base_image(title, subtitle)
    left, top, right, bottom = 120, 185, 1335, 700
    all_values = [value for values in series.values() for value in values]
    axis_max = nice_upper(max(all_values) * 1.18)
    for tick in range(6):
        value = axis_max * tick / 5
        y = bottom - (bottom - top) * tick / 5
        draw.line((left, y, right, y), fill=GRID, width=2)
        draw.text((left - 18, y), f"{value:.0f}", fill=MUTED, font=font(15), anchor="rm")
    draw.text((left, top - 22), ylabel, fill=MUTED, font=font(15), anchor="ls")
    slot = (right - left) / len(categories)
    series_names = list(series)
    group_width = slot * 0.75
    bar_width = group_width / len(series_names)
    for category_index, category in enumerate(categories):
        group_left = left + category_index * slot + (slot - group_width) / 2
        for series_index, name in enumerate(series_names):
            value = float(series[name][category_index])
            x0 = group_left + series_index * bar_width + 3
            x1 = group_left + (series_index + 1) * bar_width - 3
            y0 = bottom - value / axis_max * (bottom - top)
            draw.rectangle((x0, y0, x1, bottom), fill=TARGET_COLORS.get(name, BLUE))
        draw.multiline_text(
            (left + category_index * slot + slot / 2, bottom + 17),
            category,
            fill=INK,
            font=font(14),
            anchor="ma",
            align="center",
        )
    legend_x = right - 480
    for index, name in enumerate(series_names):
        x = legend_x + index * 160
        draw.rectangle((x, 136, x + 22, 158), fill=TARGET_COLORS.get(name, BLUE))
        draw.text((x + 32, 147), name, fill=INK, font=font(16), anchor="lm")
    draw.line((left, bottom, right, bottom), fill=INK, width=2)
    image.save(output, format="PNG", optimize=True)


def draw_histogram_grid(clean: pd.DataFrame, output: Path) -> None:
    image, draw = base_image(
        "Key numeric distributions",
        "Raw values retained; zero academic outcomes are meaningful observations, not missing data",
    )
    panels = [
        ("admission_grade", "Admission grade", 18),
        ("age_at_enrollment", "Age at enrollment", 18),
        ("curricular_units_1st_sem_approved", "Semester 1 units approved", 15),
        ("curricular_units_2nd_sem_approved", "Semester 2 units approved", 15),
    ]
    boxes = [(65, 150, 680, 445), (720, 150, 1335, 445), (65, 485, 680, 780), (720, 485, 1335, 780)]
    for (column, label, bins), (x0, y0, x1, y1) in zip(panels, boxes):
        draw.rounded_rectangle((x0, y0, x1, y1), radius=14, fill=CARD)
        plot_left, plot_top, plot_right, plot_bottom = x0 + 62, y0 + 52, x1 - 25, y1 - 52
        counts, edges = np.histogram(clean[column].to_numpy(), bins=bins)
        max_count = max(int(counts.max()), 1)
        width = (plot_right - plot_left) / len(counts)
        for index, count in enumerate(counts):
            bx0 = plot_left + index * width + 1
            bx1 = plot_left + (index + 1) * width - 1
            by0 = plot_bottom - (int(count) / max_count) * (plot_bottom - plot_top)
            draw.rectangle((bx0, by0, bx1, plot_bottom), fill=BLUE)
        draw.line((plot_left, plot_bottom, plot_right, plot_bottom), fill=INK, width=2)
        draw.text((x0 + 24, y0 + 23), label, fill=INK, font=font(18, bold=True))
        draw.text((plot_left, plot_bottom + 12), f"{edges[0]:.1f}", fill=MUTED, font=font(13), anchor="la")
        draw.text((plot_right, plot_bottom + 12), f"{edges[-1]:.1f}", fill=MUTED, font=font(13), anchor="ra")
        draw.text((plot_left - 8, plot_top), f"{max_count:,}", fill=MUTED, font=font(13), anchor="ra")
    image.save(output, format="PNG", optimize=True)


def draw_boxplot_grid(clean: pd.DataFrame, output: Path) -> None:
    image, draw = base_image(
        "Grades by final outcome",
        "Boxes show the interquartile range; line shows the median; whiskers use the 1.5×IQR rule",
    )
    panels = [
        ("admission_grade", "Admission grade"),
        ("curricular_units_1st_sem_grade", "Semester 1 average grade"),
        ("curricular_units_2nd_sem_grade", "Semester 2 average grade"),
    ]
    panel_width = 410
    for panel_index, (column, label) in enumerate(panels):
        x0 = 55 + panel_index * 445
        y0, x1, y1 = 160, x0 + panel_width, 755
        draw.rounded_rectangle((x0, y0, x1, y1), radius=14, fill=CARD)
        plot_left, plot_top, plot_right, plot_bottom = x0 + 55, y0 + 65, x1 - 25, y1 - 70
        values = clean[column]
        min_value, max_value = float(values.min()), float(values.max())
        padding = max((max_value - min_value) * 0.08, 1)
        scale_min, scale_max = min_value - padding, max_value + padding
        if column.startswith("curricular_units_") and column.endswith("_grade"):
            scale_min = max(0.0, scale_min)
        for tick in range(6):
            value = scale_min + (scale_max - scale_min) * tick / 5
            y = plot_bottom - (value - scale_min) / (scale_max - scale_min) * (plot_bottom - plot_top)
            draw.line((plot_left, y, plot_right, y), fill=GRID, width=1)
            draw.text((plot_left - 8, y), f"{value:.0f}", fill=MUTED, font=font(13), anchor="rm")
        for target_index, target in enumerate(TARGET_ORDER):
            target_values = clean.loc[clean["target"] == target, column]
            q1, median, q3 = [float(target_values.quantile(q)) for q in (0.25, 0.5, 0.75)]
            iqr = q3 - q1
            low = max(float(target_values.min()), q1 - 1.5 * iqr)
            high = min(float(target_values.max()), q3 + 1.5 * iqr)
            center_x = plot_left + (target_index + 0.5) * (plot_right - plot_left) / 3
            box_width = 58
            to_y = lambda value: plot_bottom - (value - scale_min) / (scale_max - scale_min) * (plot_bottom - plot_top)
            draw.line((center_x, to_y(high), center_x, to_y(low)), fill=INK, width=3)
            draw.line((center_x - 18, to_y(high), center_x + 18, to_y(high)), fill=INK, width=3)
            draw.line((center_x - 18, to_y(low), center_x + 18, to_y(low)), fill=INK, width=3)
            draw.rectangle(
                (center_x - box_width / 2, to_y(q3), center_x + box_width / 2, to_y(q1)),
                fill=TARGET_COLORS[target],
                outline=INK,
                width=2,
            )
            draw.line((center_x - box_width / 2, to_y(median), center_x + box_width / 2, to_y(median)), fill=CARD, width=4)
            draw.text((center_x, plot_bottom + 16), target, fill=INK, font=font(13), anchor="ma")
        draw.text((x0 + 22, y0 + 25), label, fill=INK, font=font(18, bold=True))
    image.save(output, format="PNG", optimize=True)


def create_figures(clean: pd.DataFrame, outliers: dict[str, int]) -> None:
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    target_counts = clean["target"].value_counts().reindex(TARGET_ORDER)
    draw_bar_chart(
        TARGET_ORDER,
        target_counts.astype(float).tolist(),
        "Target distribution",
        "StudentGuard source dataset (n=4,424)",
        FIGURES_DIR / "target_distribution.png",
        [TARGET_COLORS[target] for target in TARGET_ORDER],
    )

    financial_states = [
        ("Tuition not\nup to date", "tuition_fees_up_to_date", 0),
        ("Tuition\nup to date", "tuition_fees_up_to_date", 1),
        ("Debtor", "debtor", 1),
        ("Not debtor", "debtor", 0),
        ("Scholarship", "scholarship_holder", 1),
        ("No\nscholarship", "scholarship_holder", 0),
    ]
    rates = []
    for _, column, value in financial_states:
        subset = clean.loc[clean[column] == value, "target"]
        rates.append(float((subset == "Dropout").mean() * 100))
    draw_bar_chart(
        [state[0] for state in financial_states],
        rates,
        "Dropout rate by financial status",
        "Descriptive relationship only; no causal interpretation",
        FIGURES_DIR / "dropout_rate_by_financial_status.png",
        ["#D1495B", "#3A7D44", "#D1495B", "#3A7D44", "#3A7D44", "#D1495B"],
        percent=True,
    )

    academic_columns = [
        "curricular_units_1st_sem_enrolled",
        "curricular_units_1st_sem_approved",
        "curricular_units_2nd_sem_enrolled",
        "curricular_units_2nd_sem_approved",
    ]
    medians = clean.groupby("target")[academic_columns].median()
    draw_grouped_bars(
        ["Sem 1\nenrolled", "Sem 1\napproved", "Sem 2\nenrolled", "Sem 2\napproved"],
        {target: medians.loc[target].tolist() for target in TARGET_ORDER},
        "Academic progression by final outcome",
        "Median curricular units by target class",
        FIGURES_DIR / "academic_units_by_target.png",
        "Median units",
    )
    draw_histogram_grid(clean, FIGURES_DIR / "key_numeric_distributions.png")
    draw_boxplot_grid(clean, FIGURES_DIR / "grades_by_target.png")

    top_outliers = sorted(outliers.items(), key=lambda item: item[1], reverse=True)[:8]
    draw_bar_chart(
        [OUTLIER_LABELS.get(name, name.replace("_", " ")) for name, _ in top_outliers],
        [float(count) for _, count in top_outliers],
        "IQR outlier flags",
        "Statistical flags only; no rows were deleted or winsorized",
        FIGURES_DIR / "iqr_outlier_flags.png",
        [BLUE] * len(top_outliers),
    )


def markdown_feature_list(features: Sequence[str]) -> str:
    return ", ".join(f"`{feature}`" for feature in features)


def write_data_dictionary(clean: pd.DataFrame, metadata: dict) -> None:
    lookup = metadata_lookup(metadata)
    clean_to_raw = {clean_name: raw_name for raw_name, clean_name in RAW_TO_CLEAN.items()}
    lines = [
        "# StudentGuard data dictionary",
        "",
        f"Nguồn định nghĩa: [UCI dataset 697]({UCI_DATASET_URL}). Tên cột trong file clean dùng `snake_case`; cột raw không bị sửa.",
        "",
        "| Tên cột clean | Tên cột raw UCI | Ý nghĩa | Kiểu dữ liệu clean | Nhóm feature | Dùng ở Enrollment Model? |",
        "|---|---|---|---|---|---|",
    ]
    for column in clean.columns:
        raw_name = clean_to_raw[column]
        meta_item = lookup.get(raw_name.casefold(), {})
        meaning = VIETNAMESE_MEANING[column]
        if meta_item.get("units"):
            meaning += f" Đơn vị UCI: {meta_item['units']}."
        enrollment_allowed = "Có" if column in ENROLLMENT_FEATURES else "Không"
        lines.append(
            f"| `{column}` | `{raw_name}` | {meaning} | `{clean[column].dtype}` | "
            f"`{FEATURE_GROUP[column]}` | {enrollment_allowed} |"
        )
    lines.extend(
        [
            "",
            "## Ghi chú mã phân loại",
            "",
            "Các cột dạng mã số vẫn được giữ nguyên để ML Lead quyết định encoding trong pipeline. Danh mục mã đầy đủ nằm trong metadata UCI chính thức ở `data/raw/uci_dataset_697_metadata.json`. Mã 99 của nghề nghiệp cha/mẹ là một mức phân loại `(blank)` do UCI định nghĩa; pipeline không chuyển mã này thành NA.",
            "",
            "## Nhóm theo thời điểm",
            "",
            "- `enrollment_*`: có thể dùng ở thời điểm nhập học, với điều kiện hệ thống sản xuất xác nhận timestamp của dữ liệu tài chính và kinh tế vĩ mô.",
            "- `semester_1_academic`: chỉ dùng sau khi học kỳ 1 đã kết thúc và dữ liệu đã chốt.",
            "- `semester_2_academic`: chỉ dùng sau khi học kỳ 2 đã kết thúc và dữ liệu đã chốt.",
            "- `target`: nhãn kết quả cuối khóa; tuyệt đối không dùng làm feature.",
        ]
    )
    DATA_DICTIONARY.write_text("\n".join(lines) + "\n", encoding="utf-8")


def pct(value: float) -> str:
    return f"{value:.2f}%"


def write_eda_summary(
    raw: pd.DataFrame,
    clean: pd.DataFrame,
    duplicate_count: int,
    warnings: dict[str, int],
    outliers: dict[str, int],
) -> None:
    counts = clean["target"].value_counts().reindex(TARGET_ORDER)
    ratios = clean["target"].value_counts(normalize=True).reindex(TARGET_ORDER) * 100
    tuition_rates = clean.groupby("tuition_fees_up_to_date")["target"].apply(lambda series: (series == "Dropout").mean() * 100)
    debtor_rates = clean.groupby("debtor")["target"].apply(lambda series: (series == "Dropout").mean() * 100)
    scholarship_rates = clean.groupby("scholarship_holder")["target"].apply(lambda series: (series == "Dropout").mean() * 100)
    medians = clean.groupby("target")[
        [
            "admission_grade",
            "curricular_units_1st_sem_approved",
            "curricular_units_2nd_sem_approved",
            "curricular_units_1st_sem_grade",
            "curricular_units_2nd_sem_grade",
        ]
    ].median()
    age_means = clean.groupby("target")["age_at_enrollment"].mean()
    warning_count = warnings.get("without_evaluations_exceeds_enrolled:2nd_sem", 0)
    top_outliers = sorted(outliers.items(), key=lambda item: item[1], reverse=True)[:8]

    lines = [
        "# StudentGuard EDA summary",
        "",
        "## Phạm vi và chất lượng dữ liệu",
        "",
        f"- Raw: **{raw.shape[0]:,} dòng × {raw.shape[1]} cột**. Clean: **{clean.shape[0]:,} dòng × {clean.shape[1]} cột**.",
        f"- Missing cells: **{int(clean.isna().sum().sum())}**. Exact duplicate rows trong raw: **{duplicate_count}**.",
        "- Toàn bộ mã phân loại quan sát được nằm trong danh mục metadata UCI; các biến điểm nằm trong thang chính thức; các biến đếm không âm và là số nguyên.",
        f"- Có **{warning_count}** bản ghi mà `curricular_units_2nd_sem_without_evaluations` lớn hơn `curricular_units_2nd_sem_enrolled`. Pipeline giữ nguyên vì chưa có bằng chứng đây là lỗi và UCI không cung cấp khóa bản ghi để đối soát.",
        "- Không có outlier nào bị xóa, cắt ngọn hoặc thay thế. IQR chỉ được dùng để gắn cờ mô tả; các giá trị vẫn nằm trong miền hợp lệ hoặc có diễn giải hợp lý (ví dụ sinh viên lớn tuổi, học phần được công nhận, số lượt đánh giá cao).",
        "",
        "## Phân bố target",
        "",
        "| Target | Số lượng | Tỷ lệ |",
        "|---|---:|---:|",
    ]
    for target in TARGET_ORDER:
        lines.append(f"| {target} | {int(counts[target]):,} | {pct(float(ratios[target]))} |")
    lines.extend(
        [
            "",
            "Lớp `Enrolled` chỉ chiếm 17.95%, vì vậy accuracy tổng thể không đủ để đánh giá model. ML Lead nên theo dõi macro-F1, per-class recall/precision và confusion matrix trên tập test chưa từng thấy.",
            "",
            "## Insight chính",
            "",
            f"1. **Tình trạng học phí có tín hiệu rất mạnh:** nhóm chưa đóng học phí đúng hạn có tỷ lệ Dropout **{tuition_rates.loc[0]:.1f}%**, so với **{tuition_rates.loc[1]:.1f}%** ở nhóm đã đóng đúng hạn.",
            f"2. **Nợ và học bổng liên hệ rõ với kết quả:** tỷ lệ Dropout là **{debtor_rates.loc[1]:.1f}%** ở nhóm có nợ so với **{debtor_rates.loc[0]:.1f}%** ở nhóm không nợ; ở người có học bổng là **{scholarship_rates.loc[1]:.1f}%** so với **{scholarship_rates.loc[0]:.1f}%** ở người không có học bổng. Đây là liên hệ mô tả, không phải quan hệ nhân quả.",
            f"3. **Số học phần đạt phân tách nhóm rất rõ:** median học kỳ 1 là {medians.loc['Dropout', 'curricular_units_1st_sem_approved']:.0f} ở Dropout và {medians.loc['Graduate', 'curricular_units_1st_sem_approved']:.0f} ở Graduate; học kỳ 2 tương ứng là {medians.loc['Dropout', 'curricular_units_2nd_sem_approved']:.0f} và {medians.loc['Graduate', 'curricular_units_2nd_sem_approved']:.0f}.",
            f"4. **Điểm sau nhập học mạnh hơn điểm đầu vào:** median điểm đầu vào chỉ chênh {medians.loc['Graduate', 'admission_grade'] - medians.loc['Dropout', 'admission_grade']:.1f} điểm giữa Graduate và Dropout, trong khi median điểm học kỳ 2 là {medians.loc['Graduate', 'curricular_units_2nd_sem_grade']:.1f} ở Graduate và {medians.loc['Dropout', 'curricular_units_2nd_sem_grade']:.1f} ở Dropout.",
            f"5. **Nhóm Dropout lớn tuổi hơn:** tuổi nhập học trung bình là {age_means.loc['Dropout']:.1f} ở Dropout so với {age_means.loc['Graduate']:.1f} ở Graduate; cần kiểm tra fairness và hiệu năng theo nhóm tuổi.",
            "",
            "## Outlier decisions",
            "",
            "IQR flags nhiều nhất (không loại bỏ):",
            "",
            "| Biến | Số bản ghi bị gắn cờ IQR | Quyết định |",
            "|---|---:|---|",
        ]
    )
    for column, count in top_outliers:
        lines.append(f"| `{column}` | {count:,} | Giữ nguyên; kiểm tra bằng domain/range rule thay vì xóa cơ học. |")
    lines.extend(
        [
            "",
            "## Data leakage risks",
            "",
            "- `target` là kết quả cuối khóa và không xuất hiện trong bất kỳ feature set nào.",
            "- Không dùng cột học kỳ 1/2 cho Enrollment Model; chỉ mở khóa dữ liệu học kỳ sau khi kỳ đó đã kết thúc và dữ liệu được chốt.",
            "- UCI không cung cấp timestamp theo từng trường. Trước khi triển khai, cần xác nhận `debtor`, `tuition_fees_up_to_date`, `scholarship_holder`, `unemployment_rate`, `inflation_rate` và `gdp` thật sự là snapshot có sẵn tại thời điểm dự đoán.",
            "- Encoder, scaler, imputer, feature selection và SMOTE phải được fit chỉ trên training fold trong pipeline; tuyệt đối không fit trước khi chia dữ liệu hoặc trước cross-validation.",
            "- Nếu nhiều bản ghi của cùng sinh viên xuất hiện trong dữ liệu sản xuất, phải group split theo student ID. Dataset UCI này không cung cấp ID nên không thể kiểm tra rủi ro đó.",
            "- Vì Semester 2 rất gần nhãn kết quả, cần mô tả model này là cảnh báo sau học kỳ 2, không phải dự báo tại nhập học.",
            "",
            "## Biểu đồ",
            "",
            "- `outputs/figures/target_distribution.png`",
            "- `outputs/figures/key_numeric_distributions.png`",
            "- `outputs/figures/dropout_rate_by_financial_status.png`",
            "- `outputs/figures/academic_units_by_target.png`",
            "- `outputs/figures/grades_by_target.png`",
            "- `outputs/figures/iqr_outlier_flags.png`",
        ]
    )
    EDA_SUMMARY.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_readme(raw: pd.DataFrame, clean: pd.DataFrame, duplicate_count: int) -> None:
    lines = [
        "# StudentGuard data preparation",
        "",
        "## Dataset source",
        "",
        f"- Dataset: [Predict Students' Dropout and Academic Success]({UCI_DATASET_URL})",
        "- UCI dataset ID: 697",
        f"- DOI: [{UCI_DOI_URL}]({UCI_DOI_URL})",
        "- License: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/) (CC BY 4.0)",
        "",
        "Citation:",
        "",
        "> Realinho, V., Vieira Martins, M., Machado, J., & Baptista, L. (2021). Predict Students' Dropout and Academic Success [Dataset]. UCI Machine Learning Repository. https://doi.org/10.24432/C5MC89.",
        "",
        "The original semicolon-delimited `data.csv`, its official UCI ZIP, and the official API metadata are stored under `data/raw/`. The preprocessing script never writes to that directory.",
        "",
        "Verified SHA-256 checksums:",
        "",
        f"- `data/raw/data.csv`: `{EXPECTED_RAW_SHA256}`",
        "- `data/raw/uci_dataset_697.zip`: `e90e55fd65ec462ae283ebeb2cca409319e3460ed898d8754f62fb35cc83a65d`",
        "- `data/raw/uci_dataset_697_metadata.json`: `c48a8f6303ccf2a5ade930fe6e85c53df209c2933f39910344c56a53a8641d5e`",
        "",
        "## Run preprocessing",
        "",
        "From the project root:",
        "",
        "```bash",
        "python src/data_preprocessing.py",
        "```",
        "",
        "Required Python packages: `pandas`, `numpy`, and `Pillow`. The script is deterministic and overwrites only generated processed, documentation, quality-report, and named figure files.",
        "",
        "## Raw-to-processed changes",
        "",
        f"- Input: {raw.shape[0]:,} rows × {raw.shape[1]} columns. Output: {clean.shape[0]:,} rows × {clean.shape[1]} columns.",
        "- Removed BOM/leading/trailing whitespace from headers in memory, then renamed all columns to stable `snake_case` names. The source typo `Nacionality` becomes `nationality` in the clean file.",
        "- Parsed every non-target field as numeric and stripped whitespace from target labels.",
        f"- Exact duplicate rows removed: {duplicate_count}. Missing values imputed: 0.",
        "- No row was removed as an outlier. No value was winsorized, clipped, or silently corrected.",
        "- No one-hot encoding, scaling, feature selection, target encoding, or SMOTE was applied.",
        "- `feature_sets.json` contains cumulative Enrollment, Semester 1, and Semester 2 feature lists. `target` is excluded.",
        "",
        "## Outputs",
        "",
        "- `data/processed/student_dropout_clean.csv`: shared clean dataset for ML and backend use.",
        "- `data/processed/feature_sets.json`: leakage-aware cumulative feature lists.",
        "- `docs/data_dictionary.md`: field definitions, observed dtypes, feature groups, and Enrollment Model eligibility.",
        "- `docs/eda_summary.md`: data quality results, EDA insights, outlier decisions, and leakage risks.",
        "- `outputs/quality_report.json`: machine-readable quality metrics.",
        "- `outputs/figures/`: reproducible PNG figures.",
    ]
    README_DATA.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_outputs(
    raw: pd.DataFrame,
    clean: pd.DataFrame,
    metadata: dict,
    duplicate_count: int,
    errors: dict[str, int],
    warnings: dict[str, int],
    outliers: dict[str, int],
) -> None:
    PROCESSED_CSV.parent.mkdir(parents=True, exist_ok=True)
    DATA_DICTIONARY.parent.mkdir(parents=True, exist_ok=True)
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    clean.to_csv(PROCESSED_CSV, index=False, encoding="utf-8", lineterminator="\n")
    FEATURE_SETS_JSON.write_text(json.dumps(FEATURE_SETS, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    create_figures(clean, outliers)
    write_data_dictionary(clean, metadata)
    write_eda_summary(raw, clean, duplicate_count, warnings, outliers)
    write_readme(raw, clean, duplicate_count)

    counts = clean["target"].value_counts().reindex(TARGET_ORDER)
    ratios = clean["target"].value_counts(normalize=True).reindex(TARGET_ORDER)
    report = {
        "source": {
            "uci_dataset_id": 697,
            "url": UCI_DATASET_URL,
            "doi": UCI_DOI_URL,
            "license": "CC BY 4.0",
            "raw_csv_sha256": sha256(RAW_CSV),
        },
        "shape": {
            "raw_rows": int(raw.shape[0]),
            "raw_columns": int(raw.shape[1]),
            "clean_rows": int(clean.shape[0]),
            "clean_columns": int(clean.shape[1]),
        },
        "quality": {
            "missing_cells": int(clean.isna().sum().sum()),
            "missing_by_column": {column: int(value) for column, value in clean.isna().sum().items()},
            "exact_duplicate_rows_raw": duplicate_count,
            "exact_duplicate_rows_clean": int(clean.duplicated().sum()),
            "clean_dtypes": {column: str(dtype) for column, dtype in clean.dtypes.items()},
            "blocking_checks": errors,
            "non_blocking_warnings": warnings,
            "iqr_outlier_flags": outliers,
            "outlier_rows_removed": 0,
        },
        "target": {
            target: {"count": int(counts[target]), "ratio": round(float(ratios[target]), 6)}
            for target in TARGET_ORDER
        },
        "feature_set_sizes": {name: len(features) for name, features in FEATURE_SETS.items()},
    }
    QUALITY_REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    raw, metadata = load_source()
    clean, duplicate_count = build_clean_data(raw)
    errors, warnings = validate_data(clean, metadata)
    validate_feature_sets(clean.columns)
    outliers = iqr_outlier_counts(clean)
    write_outputs(raw, clean, metadata, duplicate_count, errors, warnings, outliers)
    counts = clean["target"].value_counts().reindex(TARGET_ORDER)
    ratios = clean["target"].value_counts(normalize=True).reindex(TARGET_ORDER) * 100
    print(f"Raw shape: {raw.shape}; clean shape: {clean.shape}")
    print(f"Missing cells: {int(clean.isna().sum().sum())}; duplicates removed: {duplicate_count}")
    for target in TARGET_ORDER:
        print(f"{target}: {int(counts[target])} ({ratios[target]:.2f}%)")
    print(f"Processed CSV: {PROCESSED_CSV}")
    print(f"Feature sets: {FEATURE_SETS_JSON}")
    print(f"Figures: {FIGURES_DIR}")


if __name__ == "__main__":
    main()
