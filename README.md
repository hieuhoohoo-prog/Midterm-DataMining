# Midterm-DataMining

## ML benchmark setup

This repo includes a cleaned student dropout dataset under `StudentGuard_DataLead_bundle/data/processed/student_dropout_clean.csv`.

To train and compare baseline classifiers for the midterm project:

```bash
python StudentGuard_DataLead_bundle/src/model_training.py
```

The script evaluates Logistic Regression, Decision Tree, and Random Forest using a stratified train/test split and compares accuracy, weighted F1, and confusion matrices. Results are exported to `StudentGuard_DataLead_bundle/outputs/model_comparison.json`.
