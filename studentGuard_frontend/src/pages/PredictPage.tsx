import React, { useEffect, useState } from 'react';
import {
  Alert,
  AutoComplete,
  Button,
  Card,
  Col,
  Collapse,
  Divider,
  Empty,
  Form,
  Input,
  List,
  Row,
  Space,
  Steps,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  AlertOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  FieldMeta,
  PredictionOut,
  RiskExplanation,
  StudentListItem,
  StudentPage,
  StudentRecord,
} from '../types';
import {
  GROUP_LABELS,
  renderTargetTag,
  RiskGauge,
  STAGE_LABELS,
} from '../utils/ui';
import { MetaFormItems } from '../components/MetaFormItems';

const { Title, Text } = Typography;

const STAGE_ORDER: ('enrollment' | 'semester_1' | 'semester_2')[] = [
  'enrollment',
  'semester_1',
  'semester_2',
];

export const PredictPage: React.FC = () => {
  const { meta } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStudent = searchParams.get('student') || 'SV0001';

  const [form] = Form.useForm();
  const [studentCode, setStudentCode] = useState<string>(initialStudent);
  const [loadedStudent, setLoadedStudent] = useState<StudentRecord | null>(null);
  const [searchOptions, setSearchOptions] = useState<{ value: string; label: React.ReactNode }[]>([]);
  const [stageIdx, setStageIdx] = useState<number>(2); // default semester_2
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<PredictionOut | null>(null);
  const [explain, setExplain] = useState<RiskExplanation | null>(null);

  const stage = STAGE_ORDER[stageIdx];

  const loadStudentIntoForm = async (code: string, notify = false) => {
    try {
      const stuRes = await api.get<StudentRecord>(`/api/students/${code.trim()}`);
      setLoadedStudent(stuRes.data);
      form.setFieldsValue(stuRes.data);
      setStudentCode(stuRes.data.student_code);
      // Reset previous prediction output so clicking "Run Prediction & Save" clearly produces the new evaluation
      setResult(null);
      setExplain(null);
      if (notify) {
        message.info(
          `Loaded profile for ${stuRes.data.student_code}. Click "Run Prediction & Save" to evaluate.`
        );
      }
    } catch {
      message.warning(`Student ID "${code}" not found in database. You can still enter values manually.`);
    }
  };

  useEffect(() => {
    loadStudentIntoForm(initialStudent, false);
  }, [initialStudent]);

  const handleStudentSearch = async (val: string) => {
    setStudentCode(val);
    if (!val || val.trim().length < 2) {
      setSearchOptions([]);
      return;
    }
    try {
      const res = await api.get<StudentPage>('/api/search/students', {
        params: { q: val.trim(), page_size: 6 },
      });
      setSearchOptions(
        res.data.items.map((item: StudentListItem) => ({
          value: item.student_code,
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>
                <strong>{item.student_code}</strong> – {item.course_name || `Course #${item.course}`}
              </span>
              {renderTargetTag(item.target)}
            </div>
          ),
        }))
      );
    } catch {
      setSearchOptions([]);
    }
  };

  const activeGroups =
    stage === 'enrollment'
      ? ['personal', 'family', 'admission', 'financial', 'macro']
      : stage === 'semester_1'
      ? ['personal', 'family', 'admission', 'financial', 'macro', 'semester_1']
      : ['personal', 'family', 'admission', 'financial', 'macro', 'semester_1', 'semester_2'];

  const groupedFields = (meta?.fields || [])
    .filter((f) => activeGroups.includes(f.group))
    .reduce<Record<string, FieldMeta[]>>((acc, f) => {
      acc[f.group] = acc[f.group] || [];
      acc[f.group].push(f);
      return acc;
    }, {});

  const handleRunPrediction = async (formValues?: any) => {
    setSubmitting(true);
    try {
      // Combine baseline student attributes with all current form values (including collapsed panels)
      const values: Record<string, any> = {
        ...(loadedStudent || {}),
        ...form.getFieldsValue(true),
        ...(formValues || {}),
      };

      const endpoint =
        stage === 'enrollment'
          ? '/api/predict/enrollment'
          : stage === 'semester_1'
          ? '/api/predict/semester-1'
          : '/api/predict/semester-2';
      const code = studentCode.trim() || 'SV_SIM';
      const res = await api.post<PredictionOut>(endpoint, values, {
        params: { student_code: code },
      });
      setResult(res.data);

      // Build live explanation from submitted form values (supports What-If simulation!)
      const factors: RiskExplanation['factors'] = [];
      if (Number(values.tuition_fees_up_to_date) === 0) {
        factors.push({
          key: 'tuition_fees_up_to_date',
          label: 'Tuition Fees Up to Date',
          value: 0,
          weight: 0.35,
          impact: 'increase',
          description: 'Tuition fees are overdue (+35% dropout risk contribution).',
        });
      }
      if (Number(values.debtor) === 1) {
        factors.push({
          key: 'debtor',
          label: 'Debtor Status',
          value: 1,
          weight: 0.2,
          impact: 'increase',
          description: 'Student has active financial debt (+20% dropout risk contribution).',
        });
      }
      if (
        (stage === 'semester_1' || stage === 'semester_2') &&
        Number(values.curricular_units_1st_sem_grade ?? 20) < 10
      ) {
        factors.push({
          key: 'curricular_units_1st_sem_grade',
          label: 'Sem 1 Grade Average',
          value: Number(values.curricular_units_1st_sem_grade),
          weight: 0.25,
          impact: 'increase',
          description: '1st semester grade average is below 10/20 (+25% dropout risk contribution).',
        });
      }
      if (Number(values.scholarship_holder) === 1) {
        factors.push({
          key: 'scholarship_holder',
          label: 'Scholarship Holder',
          value: 1,
          weight: 0,
          impact: 'decrease',
          description: 'Student holds a scholarship (protective factor against dropout).',
        });
      }

      const suggestions: string[] = [];
      if (Number(values.tuition_fees_up_to_date) === 0 || Number(values.debtor) === 1) {
        suggestions.push(
          'Contact the Financial Aid Office to arrange a tuition payment extension or installment plan.'
        );
        suggestions.push('Advise the student on emergency financial assistance or scholarship options.');
      }
      if (
        (stage === 'semester_1' || stage === 'semester_2') &&
        Number(values.curricular_units_1st_sem_grade ?? 20) < 10
      ) {
        suggestions.push(
          'Schedule a 1-on-1 academic advising session and adjust next semester course load.'
        );
      }
      if (suggestions.length === 0) {
        suggestions.push('Maintain regular semester check-ins; academic progress is stable.');
      }

      setExplain({
        student_code: code,
        stage,
        base_score: 0.15,
        estimated_score: res.data.risk_score,
        risk_level: res.data.risk_level,
        factors,
        suggestions,
        note: 'Evaluation saved to Prediction Logs.',
      });

      message.success(
        `Evaluated ${code} (${STAGE_LABELS[stage]}): ${res.data.risk_level} Risk (${Math.round(
          res.data.risk_score * 100
        )}%)`
      );
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      message.error(
        typeof detail === 'string'
          ? detail
          : 'Failed to run prediction. Please check that all required fields are valid.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
          Multi-Stage Dropout Risk Assessment & What-If Simulator
        </Title>
        <Text type="secondary">
          Load an existing student record or modify input parameters ("What-if analysis") to
          simulate how financial or academic interventions impact dropout risk.
        </Text>
      </div>

      {/* Stepper Card */}
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Row gutter={[20, 16]} align="middle">
          <Col xs={24} lg={9}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              1. Select Student to Evaluate (Auto-fills Form):
            </Text>
            <Space.Compact style={{ width: '100%' }}>
              <AutoComplete
                value={studentCode}
                options={searchOptions}
                onSearch={handleStudentSearch}
                onSelect={(val) => loadStudentIntoForm(val, true)}
                style={{ width: '100%' }}
              >
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="Enter Student ID (e.g., SV0001, SV0256...)"
                />
              </AutoComplete>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => loadStudentIntoForm(studentCode, true)}
              >
                Load Profile
              </Button>
              <Button
                icon={<UserOutlined />}
                onClick={() => navigate(`/students/${studentCode}`)}
              >
                View Profile
              </Button>
            </Space.Compact>
          </Col>

          <Col xs={24} lg={15}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              2. Select Prediction Stage (Leakage-Aware Feature Sets):
            </Text>
            <Steps
              current={stageIdx}
              onChange={(idx) => {
                setStageIdx(idx);
                setResult(null);
                setExplain(null);
              }}
              size="small"
              items={[
                {
                  title: 'At Enrollment',
                  description: '24 entry features',
                },
                {
                  title: 'After Semester 1',
                  description: '30 features (+6 Sem 1)',
                },
                {
                  title: 'After Semester 2',
                  description: '36 features (+6 Sem 2)',
                },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {/* Left: Feature Form */}
        <Col xs={24} lg={15}>
          <Card
            title={
              <Space size={10} wrap style={{ paddingRight: 16 }}>
                <ExperimentOutlined style={{ color: '#2563eb' }} />
                <span>Model Input Features</span>
                <Tag color="blue" style={{ margin: 0, fontWeight: 600 }}>
                  Stage: {STAGE_LABELS[stage]}
                </Tag>
              </Space>
            }
            extra={
              <Button
                type="primary"
                icon={<AlertOutlined />}
                loading={submitting}
                onClick={() => handleRunPrediction()}
                style={{ marginLeft: 12 }}
              >
                Run Prediction & Save
              </Button>
            }
            bordered={false}
            style={{ borderRadius: 12 }}
          >
            <Form form={form} layout="vertical" onFinish={handleRunPrediction}>
              <Collapse
                defaultActiveKey={['financial', 'semester_1', 'semester_2', 'admission']}
                items={Object.entries(groupedFields).map(([grp, fields]) => ({
                  key: grp,
                  forceRender: true,
                  label: (
                    <Space>
                      <strong>{GROUP_LABELS[grp] || grp}</strong>
                      <Tag>{fields.length} features</Tag>
                    </Space>
                  ),
                  children: <MetaFormItems fields={fields} colSpan={8} />,
                }))}
              />
            </Form>
          </Card>
        </Col>

        {/* Right: Prediction Result & Explanation */}
        <Col xs={24} lg={9}>
          <Card
            title="Evaluation Result & Factor Breakdown"
            bordered={false}
            style={{ borderRadius: 12, position: 'sticky', top: 84 }}
          >
            {result && explain ? (
              <>
                <RiskGauge score={result.risk_score} level={result.risk_level} />

                <Alert
                  type="success"
                  showIcon
                  style={{ marginTop: 12 }}
                  message={`Saved Evaluation #${result.id} for ${result.student_code}`}
                  description={`Predicted Outcome: ${result.predicted_label} · Stage: ${
                    STAGE_LABELS[result.stage] || result.stage
                  }`}
                />

                <Divider style={{ margin: '16px 0 12px' }} orientation="left">
                  Key Contributing Factors
                </Divider>

                {explain.factors.length === 0 ? (
                  <Alert
                    type="success"
                    showIcon
                    message="No financial or low-grade risk triggers detected."
                  />
                ) : (
                  <List
                    size="small"
                    dataSource={explain.factors}
                    renderItem={(f) => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <Space>
                              {f.impact === 'increase' ? (
                                <Tag color="error">+{Math.round(f.weight * 100)}% Risk</Tag>
                              ) : (
                                <Tag color="success">Protective</Tag>
                              )}
                              <Text strong>{f.label}</Text>
                            </Space>
                          }
                          description={f.description}
                        />
                      </List.Item>
                    )}
                  />
                )}

                <Divider style={{ margin: '16px 0 12px' }} orientation="left">
                  Recommended Interventions
                </Divider>
                <List
                  size="small"
                  dataSource={explain.suggestions}
                  renderItem={(s) => (
                    <List.Item>
                      <Space align="start">
                        <CheckCircleOutlined style={{ color: '#2563eb', marginTop: 4 }} />
                        <Text style={{ fontSize: 13 }}>{s}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </>
            ) : (
              <div style={{ padding: '24px 8px', textAlign: 'center' }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <Space direction="vertical" size={4}>
                      <Text strong style={{ color: '#0f172a' }}>
                        Ready to Evaluate {studentCode} ({STAGE_LABELS[stage]})
                      </Text>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        Review or adjust any input features on the left, then click the button below
                        to compute the risk score and save the evaluation.
                      </Text>
                    </Space>
                  }
                >
                  <Button
                    type="primary"
                    size="large"
                    icon={<AlertOutlined />}
                    loading={submitting}
                    onClick={() => handleRunPrediction()}
                  >
                    Run Prediction & Save ({STAGE_LABELS[stage]})
                  </Button>
                </Empty>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  );
};
