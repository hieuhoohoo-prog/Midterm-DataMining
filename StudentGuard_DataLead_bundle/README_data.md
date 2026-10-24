# StudentGuard data preparation

## Dataset source

- Dataset: [Predict Students' Dropout and Academic Success](https://archive.ics.uci.edu/dataset/697/predict+students+dropout+and+academic+success)
- UCI dataset ID: 697
- DOI: [https://doi.org/10.24432/C5MC89](https://doi.org/10.24432/C5MC89)
- License: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/) (CC BY 4.0)

Citation:

> Realinho, V., Vieira Martins, M., Machado, J., & Baptista, L. (2021). Predict Students' Dropout and Academic Success [Dataset]. UCI Machine Learning Repository. https://doi.org/10.24432/C5MC89.

The original semicolon-delimited `data.csv`, its official UCI ZIP, and the official API metadata are stored under `data/raw/`. The preprocessing script never writes to that directory.

Verified SHA-256 checksums:

- `data/raw/data.csv`: `3ef126de5cefff26eb11fbb4237f1a1401cb64b488e2f1d598c23cedeb4c45ae`
- `data/raw/uci_dataset_697.zip`: `e90e55fd65ec462ae283ebeb2cca409319e3460ed898d8754f62fb35cc83a65d`
- `data/raw/uci_dataset_697_metadata.json`: `c48a8f6303ccf2a5ade930fe6e85c53df209c2933f39910344c56a53a8641d5e`

## Run preprocessing

From the project root:

```bash
python src/data_preprocessing.py
```

Required Python packages: `pandas`, `numpy`, and `Pillow`. The script is deterministic and overwrites only generated processed, documentation, quality-report, and named figure files.

## Raw-to-processed changes

- Input: 4,424 rows × 37 columns. Output: 4,424 rows × 37 columns.
- Removed BOM/leading/trailing whitespace from headers in memory, then renamed all columns to stable `snake_case` names. The source typo `Nacionality` becomes `nationality` in the clean file.
- Parsed every non-target field as numeric and stripped whitespace from target labels.
- Exact duplicate rows removed: 0. Missing values imputed: 0.
- No row was removed as an outlier. No value was winsorized, clipped, or silently corrected.
- No one-hot encoding, scaling, feature selection, target encoding, or SMOTE was applied.
- `feature_sets.json` contains cumulative Enrollment, Semester 1, and Semester 2 feature lists. `target` is excluded.

## Outputs

- `data/processed/student_dropout_clean.csv`: shared clean dataset for ML and backend use.
- `data/processed/feature_sets.json`: leakage-aware cumulative feature lists.
- `docs/data_dictionary.md`: field definitions, observed dtypes, feature groups, and Enrollment Model eligibility.
- `docs/eda_summary.md`: data quality results, EDA insights, outlier decisions, and leakage risks.
- `outputs/quality_report.json`: machine-readable quality metrics.
- `outputs/figures/`: reproducible PNG figures.
