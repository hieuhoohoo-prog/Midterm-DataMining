export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: 'Admin' | 'Academic Advisor';
  full_name: string;
}

export interface UserOut {
  id: number;
  username: string;
  full_name: string;
  role: 'Admin' | 'Academic Advisor';
}

export interface OptionItem {
  value: number;
  label: string;
}

export interface FieldMeta {
  name: string;
  label: string;
  group: 'personal' | 'family' | 'admission' | 'financial' | 'macro' | 'semester_1' | 'semester_2';
  type: 'int' | 'float' | 'binary' | 'categorical';
  min?: number | null;
  max?: number | null;
  options?: OptionItem[] | null;
}

export interface MetaResponse {
  fields: FieldMeta[];
  feature_sets: {
    enrollment_features?: string[];
    semester_1_features?: string[];
    semester_2_features?: string[];
    [key: string]: string[] | undefined;
  };
  targets: string[];
  risk_levels: string[];
  stages: string[];
}

export interface StudentRecord {
  id: number;
  student_code: string;
  target?: 'Dropout' | 'Enrolled' | 'Graduate' | null;
  marital_status: number;
  application_mode: number;
  application_order: number;
  course: number;
  daytime_evening_attendance: number;
  previous_qualification: number;
  previous_qualification_grade: number;
  nationality: number;
  mothers_qualification: number;
  fathers_qualification: number;
  mothers_occupation: number;
  fathers_occupation: number;
  admission_grade: number;
  displaced: number;
  educational_special_needs: number;
  debtor: number;
  tuition_fees_up_to_date: number;
  gender: number;
  scholarship_holder: number;
  age_at_enrollment: number;
  international: number;
  unemployment_rate: number;
  inflation_rate: number;
  gdp: number;
  curricular_units_1st_sem_credited: number;
  curricular_units_1st_sem_enrolled: number;
  curricular_units_1st_sem_evaluations: number;
  curricular_units_1st_sem_approved: number;
  curricular_units_1st_sem_grade: number;
  curricular_units_1st_sem_without_evaluations: number;
  curricular_units_2nd_sem_credited: number;
  curricular_units_2nd_sem_enrolled: number;
  curricular_units_2nd_sem_evaluations: number;
  curricular_units_2nd_sem_approved: number;
  curricular_units_2nd_sem_grade: number;
  curricular_units_2nd_sem_without_evaluations: number;
  [key: string]: number | string | null | undefined;
}

export interface StudentListItem {
  student_code: string;
  course: number;
  course_name?: string | null;
  gender: number;
  age_at_enrollment: number;
  daytime_evening_attendance: number;
  admission_grade: number;
  tuition_fees_up_to_date: number;
  debtor: number;
  scholarship_holder: number;
  curricular_units_1st_sem_grade: number;
  curricular_units_2nd_sem_grade: number;
  curricular_units_1st_sem_approved: number;
  curricular_units_2nd_sem_approved: number;
  target?: string | null;
  latest_risk_level?: 'High' | 'Medium' | 'Low' | null;
  latest_risk_score?: number | null;
}

export interface StudentPage {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: StudentListItem[];
}

export interface SemesterSummary {
  enrolled: number;
  approved: number;
  credited: number;
  evaluations: number;
  without_evaluations: number;
  grade: number;
  approval_rate?: number | null;
}

export interface PredictionOut {
  id: number;
  student_code: string;
  stage: 'enrollment' | 'semester_1' | 'semester_2' | string;
  risk_score: number;
  risk_level: 'High' | 'Medium' | 'Low' | string;
  predicted_label: 'Dropout' | 'Enrolled' | 'Graduate' | string;
  evaluated_by?: number;
  evaluator_name?: string | null;
  created_at: string;
}

export interface StudentProfile {
  student: StudentRecord;
  labels: Record<string, string | null>;
  semester_1: SemesterSummary;
  semester_2: SemesterSummary;
  latest_prediction?: PredictionOut | null;
  prediction_count: number;
}

export interface PredictionPage {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: PredictionOut[];
}

export interface RiskFactor {
  key: string;
  label: string;
  value?: number | null;
  weight: number;
  impact: 'increase' | 'decrease' | 'context';
  description: string;
}

export interface RiskExplanation {
  student_code: string;
  stage: string;
  base_score: number;
  estimated_score: number;
  risk_level: 'High' | 'Medium' | 'Low' | string;
  factors: RiskFactor[];
  suggestions: string[];
  note: string;
}

export interface OverviewStats {
  total_students: number;
  by_target: Record<string, number>;
  target_rate: Record<string, number>;
  by_gender: Record<string, number>;
  by_attendance: Record<string, number>;
  financial: {
    debtors: number;
    tuition_not_up_to_date: number;
    scholarship_holders: number;
    international: number;
  };
  averages: {
    age_at_enrollment: number | null;
    admission_grade: number | null;
    semester_1_grade: number | null;
    semester_2_grade: number | null;
  };
  total_courses: number;
  total_users: number;
  predictions: {
    total_runs: number;
    students_evaluated: number;
    latest_by_risk_level: Record<string, number>;
  };
}

export interface GroupRateItem {
  value: number;
  label?: string | null;
  total: number;
  counts: Record<string, number>;
  rates: Record<string, number>;
}

export interface HistogramBin {
  start: number;
  end: number;
  total: number;
  counts: Record<string, number>;
}

