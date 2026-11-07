from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = PROJECT_ROOT / "data" / "processed" / "student_dropout_clean.csv"
OUTPUT_DIR = PROJECT_ROOT / "outputs"
RESULTS_PATH = OUTPUT_DIR / "model_comparison.json"
TARGET_COLUMN = "target"


def summarize_results(name: str, y_true: pd.Series, y_pred: pd.Series) -> dict:
    class_labels = sorted(y_true.unique().tolist())
    return {
        "model": name,
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 6),
        "precision_weighted": round(float(precision_score(y_true, y_pred, average="weighted", zero_division=0)), 6),
        "recall_weighted": round(float(recall_score(y_true, y_pred, average="weighted", zero_division=0)), 6),
        "f1_weighted": round(float(f1_score(y_true, y_pred, average="weighted", zero_division=0)), 6),
        "precision_macro": round(float(precision_score(y_true, y_pred, average="macro", zero_division=0)), 6),
        "recall_macro": round(float(recall_score(y_true, y_pred, average="macro", zero_division=0)), 6),
        "f1_macro": round(float(f1_score(y_true, y_pred, average="macro", zero_division=0)), 6),
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=class_labels).tolist(),
        "class_labels": class_labels,
    }


def main() -> None:
    df = pd.read_csv(DATA_PATH)
    X = df.drop(columns=[TARGET_COLUMN])
    y = df[TARGET_COLUMN]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    models = {
        "Logistic Regression": LogisticRegression(
            max_iter=2000,
            solver="lbfgs",
            class_weight="balanced",
            random_state=42,
        ),
        "Decision Tree": DecisionTreeClassifier(
            random_state=42,
            class_weight="balanced",
            max_depth=None,
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=300,
            random_state=42,
            class_weight="balanced",
            n_jobs=-1,
        ),
    }

    results = []
    for name, estimator in models.items():
        pipeline = Pipeline(
            [
                (
                    "preprocessor",
                    ColumnTransformer(
                        transformers=[("num", StandardScaler(), X.columns.tolist())],
                        remainder="drop",
                    ),
                ),
                ("model", estimator),
            ]
        )
        pipeline.fit(X_train, y_train)
        y_pred = pd.Series(pipeline.predict(X_test), index=y_test.index, name=y_test.name)
        results.append(summarize_results(name, y_test, y_pred))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with RESULTS_PATH.open("w", encoding="utf-8") as fp:
        json.dump(results, fp, indent=2)

    best = max(results, key=lambda item: item["f1_macro"])
    print("Model benchmark comparison")
    print('-' * 120)
    for item in results:
        print(
            f"{item['model']:<20} | "
            f"accuracy={item['accuracy']:.4f} | "
            f"precision_weighted={item['precision_weighted']:.4f} | "
            f"recall_weighted={item['recall_weighted']:.4f} | "
            f"f1_weighted={item['f1_weighted']:.4f} | "
            f"f1_macro={item['f1_macro']:.4f}"
        )
    print('-' * 120)
    print(f"Best model by macro F1: {best['model']} ({best['f1_macro']:.4f})")
    print(f"Saved benchmark to: {RESULTS_PATH}")


if __name__ == "__main__":
    main()
