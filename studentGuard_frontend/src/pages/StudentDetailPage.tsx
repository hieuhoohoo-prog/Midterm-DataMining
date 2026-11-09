import React, { useEffect, useState } from 'react';
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Form,
  List,
  Modal,
  Progress,
  Row,
  Segmented,
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  AlertOutlined,
  ArrowLeftOutlined,
  BookOutlined,
  CheckCircleOutlined,
  EditOutlined,
  HistoryOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  FieldMeta,
  PredictionOut,
  RiskExplanation,
  StudentProfile,
} from '../types';
import {
  GROUP_LABELS,
  renderRiskTag,
  renderTargetTag,
  RiskGauge,
  STAGE_LABELS,
} from '../utils/ui';
import { MetaFormItems } from '../components/MetaFormItems';

const { Title, Text } = Typography;

export const StudentDetailPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, meta } = useAuth();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [predictions, setPredictions] = useState<PredictionOut[]>([]);
  const [riskStage, setRiskStage] = useState<'enrollment' | 'semester_1' | 'semester_2'>('semester_2');
  const [riskExplain, setRiskExplain] = useState<RiskExplanation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [runningPredict, setRunningPredict] = useState<boolean>(false);

  // Admin Edit modal
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [editForm] = Form.useForm();

  const loadStudentData = async () => {
    if (!code) return;
    setLoading(true);
    try {
      const [profRes, predRes, riskRes] = await Promise.all([
        api.get<StudentProfile>(`/api/students/${code}/profile`),
        api.get<PredictionOut[]>(`/api/students/${code}/predictions`),
        api.get<RiskExplanation>(`/api/students/${code}/risk-factors`, {
          params: { stage: riskStage },
        }),
      ]);
      setProfile(profRes.data);
      setPredictions(predRes.data);
      setRiskExplain(riskRes.data);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Student record not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, [code]);

  useEffect(() => {
    if (!code) return;
    api
      .get<RiskExplanation>(`/api/students/${code}/risk-factors`, {
        params: { stage: riskStage },
      })
      .then((res) => setRiskExplain(res.data));
  }, [riskStage, code]);

  const handleQuickEvaluate = async () => {
    if (!profile || !code) return;
    setRunningPredict(true);
    try {
      const endpoint =
        riskStage === 'enrollment'
          ? '/api/predict/enrollment'
          : riskStage === 'semester_1'
          ? '/api/predict/semester-1'
          : '/api/predict/semester-2';
      await api.post(endpoint, profile.student, {
        params: { student_code: code },
      });
      message.success(`Evaluation saved (${STAGE_LABELS[riskStage]})!`);
      loadStudentData();
    } catch (err: any) {
      message.error(
        typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : 'Failed to run prediction'
      );
    } finally {
      setRunningPredict(false);
    }
  };

  const openEditModal = () => {
    if (!profile) return;
    editForm.setFieldsValue(profile.student);
    setEditOpen(true);
  };

  const handleUpdateStudent = async (values: any) => {
    if (!code) return;
    setSavingEdit(true);
    try {
      const allValues = { ...editForm.getFieldsValue(true), ...values };
      await api.put(`/api/students/${code}`, allValues);
      message.success('Student record updated successfully!');
      setEditOpen(false);
      loadStudentData();
    } catch (err: any) {
      message.error(
        typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : 'Failed to update student record'
      );
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading || !profile) {
    return <Skeleton active paragraph={{ rows: 12 }} />;
  }

  const s = profile.student;
  const lbl = profile.labels;

  const formatFieldVal = (field: string) => {
    const val = s[field];
    const text = lbl[field];
    if (text) return `${text} (${val})`;
    return val;
  };

  const semesterChartData = [
    {
      name: 'Semester 1',
      Enrolled: profile.semester_1.enrolled,
      Approved: profile.semester_1.approved,
      Credited: profile.semester_1.credited,
      'No Evaluation': profile.semester_1.without_evaluations,
    },
    {
      name: 'Semester 2',
      Enrolled: profile.semester_2.enrolled,
      Approved: profile.semester_2.approved,
      Credited: profile.semester_2.credited,
      'No Evaluation': profile.semester_2.without_evaluations,
    },
  ];

  const groupedFields = (meta?.fields || []).reduce<Record<string, FieldMeta[]>>((acc, f) => {
    acc[f.group] = acc[f.group] || [];
    acc[f.group].push(f);
    return acc;
  }, {});

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Breadcrumb
        items={[
          { title: <Link to="/">Academic Overview</Link> },
          { title: <Link to="/students">Student Directory</Link> },
          { title: s.student_code },
        ]}
      />

      {/* Student Header Banner */}
      <Card bordered={false} style={{ borderRadius: 14 }}>
        <Row gutter={[24, 16]} align="middle" justify="space-between">
          <Col xs={24} lg={15}>
            <Space size={16} align="start">
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  fontWeight: 700,
                }}
              >
                {s.student_code.replace('SV', '')}
              </div>
              <div>
                <Space size={10} align="center" wrap>
                  <Title level={3} style={{ margin: 0 }}>
                    Student {s.student_code}
                  </Title>
                  {renderTargetTag(s.target)}
                  {profile.latest_prediction &&
                    renderRiskTag(
                      profile.latest_prediction.risk_level,
                      profile.latest_prediction.risk_score
                    )}
                </Space>
                <div style={{ marginTop: 6, color: '#475569', fontSize: 14 }}>
                  <strong>Program:</strong> {lbl.course || `Course #${s.course}`} ({s.course})
                  {' · '}
                  <strong>Regime:</strong> {lbl.daytime_evening_attendance || s.daytime_evening_attendance}
                </div>
                <Space size={6} style={{ marginTop: 10 }} wrap>
                  <Tag color={s.gender === 1 ? 'geekblue' : 'magenta'}>
                    Gender: {lbl.gender || s.gender}
                  </Tag>
                  <Tag>Age at Enrollment: {s.age_at_enrollment}</Tag>
                  <Tag color={s.tuition_fees_up_to_date === 1 ? 'success' : 'error'}>
                    Tuition: {lbl.tuition_fees_up_to_date}
                  </Tag>
                  <Tag color={s.debtor === 1 ? 'warning' : 'default'}>
                    Debtor: {lbl.debtor}
                  </Tag>
                  <Tag color={s.scholarship_holder === 1 ? 'cyan' : 'default'}>
                    Scholarship: {lbl.scholarship_holder}
                  </Tag>
                </Space>
              </div>
            </Space>
          </Col>

          <Col xs={24} lg={9} style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Space wrap>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/students')}>
                Directory
              </Button>
              {user?.role === 'Admin' && (
                <Button icon={<EditOutlined />} onClick={openEditModal}>
                  Edit Record
                </Button>
              )}
              <Button
                type="primary"
                icon={<AlertOutlined />}
                onClick={() => navigate(`/predict?student=${s.student_code}`)}
              >
                Open What-If Simulator
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Main Content Tabs (Ellucian Banner style) */}
      <Tabs
        defaultActiveKey="risk"
        size="large"
        items={[
          {
            key: 'risk',
            label: (
              <span>
                <SafetyCertificateOutlined /> Risk Analysis & Recommendations
              </span>
            ),
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={8}>
                  <Card
                    title="Dropout Risk Index"
                    extra={
                      <Segmented
                        size="small"
                        value={riskStage}
                        onChange={(v) => setRiskStage(v as any)}
                        options={[
                          { value: 'enrollment', label: 'Enrollment' },
                          { value: 'semester_1', label: 'Sem 1' },
                          { value: 'semester_2', label: 'Sem 2' },
                        ]}
                      />
                    }
                    bordered={false}
                    style={{ borderRadius: 12, height: '100%' }}
                  >
                    {riskExplain && (
                      <>
                        <RiskGauge
                          score={riskExplain.estimated_score}
                          level={riskExplain.risk_level}
                        />
                        <div style={{ marginTop: 16, textAlign: 'center' }}>
                          <Button
                            type="primary"
                            loading={runningPredict}
                            onClick={handleQuickEvaluate}
                            block
                          >
                            Save Evaluation ({STAGE_LABELS[riskStage]}) to Logs
                          </Button>
                        </div>
                        <Alert
                          type="info"
                          showIcon
                          style={{ marginTop: 16, fontSize: 12 }}
                          message={riskExplain.note}
                        />
                      </>
                    )}
                  </Card>
                </Col>

                <Col xs={24} lg={16}>
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <Card
                      title="Explainable Risk Factor Breakdown"
                      bordered={false}
                      style={{ borderRadius: 12 }}
                    >
                      {riskExplain && riskExplain.factors.length === 0 ? (
                        <Alert
                          type="success"
                          showIcon
                          message="No abnormal risk triggers detected at this stage."
                        />
                      ) : (
                        <List
                          dataSource={riskExplain?.factors || []}
                          renderItem={(f) => (
                            <List.Item>
                              <List.Item.Meta
                                avatar={
                                  f.impact === 'increase' ? (
                                    <Tag color="error" style={{ fontWeight: 700 }}>
                                      +{Math.round(f.weight * 100)}% Risk
                                    </Tag>
                                  ) : f.impact === 'decrease' ? (
                                    <Tag color="success">Protective</Tag>
                                  ) : (
                                    <Tag color="warning">Contextual</Tag>
                                  )
                                }
                                title={
                                  <Text strong>
                                    {f.label}{' '}
                                    <Text type="secondary" style={{ fontWeight: 400 }}>
                                      (Current Value: {f.value})
                                    </Text>
                                  </Text>
                                }
                                description={f.description}
                              />
                            </List.Item>
                          )}
                        />
                      )}
                    </Card>

                    <Card
                      title="Advisor Intervention Recommendations"
                      bordered={false}
                      style={{ borderRadius: 12 }}
                    >
                      <List
                        size="small"
                        dataSource={riskExplain?.suggestions || []}
                        renderItem={(item) => (
                          <List.Item>
                            <Space>
                              <CheckCircleOutlined style={{ color: '#2563eb' }} />
                              <Text>{item}</Text>
                            </Space>
                          </List.Item>
                        )}
                      />
                    </Card>
                  </Space>
                </Col>
              </Row>
            ),
          },
          {
            key: 'academic',
            label: (
              <span>
                <BookOutlined /> Academic Performance (Sem 1 & 2)
              </span>
            ),
            children: (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {profile.semester_1.enrolled === 0 && profile.semester_2.enrolled === 0 && (
                  <Alert
                    type="warning"
                    showIcon
                    message="Zero Curricular Units Enrolled Across Both Semesters (0 Units)"
                    description="According to institutional records, this student completed initial admission but withdrew immediately without enrolling in or taking exams for any courses."
                  />
                )}
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Card title="Semester 1 Summary" bordered={false} style={{ borderRadius: 12 }}>
                      <Row gutter={16}>
                        <Col span={8}>
                          <Statistic
                            title="Sem 1 Grade Avg"
                            value={profile.semester_1.grade}
                            precision={2}
                            suffix="/ 20"
                            valueStyle={{
                              color: profile.semester_1.grade < 10 ? '#dc2626' : '#16a34a',
                            }}
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic
                            title="Approved Units"
                            value={profile.semester_1.approved}
                            suffix={`/ ${profile.semester_1.enrolled}`}
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic
                            title="Evaluations"
                            value={profile.semester_1.evaluations}
                          />
                        </Col>
                      </Row>
                      <div style={{ marginTop: 16 }}>
                        <Text type="secondary">Semester 1 Unit Approval Rate:</Text>
                        <Progress
                          percent={Math.round((profile.semester_1.approval_rate || 0) * 100)}
                          status={
                            (profile.semester_1.approval_rate || 0) < 0.5 ? 'exception' : 'normal'
                          }
                        />
                      </div>
                    </Card>
                  </Col>

                  <Col xs={24} md={12}>
                    <Card title="Semester 2 Summary" bordered={false} style={{ borderRadius: 12 }}>
                      <Row gutter={16}>
                        <Col span={8}>
                          <Statistic
                            title="Sem 2 Grade Avg"
                            value={profile.semester_2.grade}
                            precision={2}
                            suffix="/ 20"
                            valueStyle={{
                              color: profile.semester_2.grade < 10 ? '#dc2626' : '#16a34a',
                            }}
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic
                            title="Approved Units"
                            value={profile.semester_2.approved}
                            suffix={`/ ${profile.semester_2.enrolled}`}
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic
                            title="Evaluations"
                            value={profile.semester_2.evaluations}
                          />
                        </Col>
                      </Row>
                      <div style={{ marginTop: 16 }}>
                        <Text type="secondary">Semester 2 Unit Approval Rate:</Text>
                        <Progress
                          percent={Math.round((profile.semester_2.approval_rate || 0) * 100)}
                          status={
                            (profile.semester_2.approval_rate || 0) < 0.5 ? 'exception' : 'normal'
                          }
                        />
                      </div>
                    </Card>
                  </Col>
                </Row>

                <Card
                  title="Enrolled vs. Approved Curricular Units Across Semesters"
                  bordered={false}
                  style={{ borderRadius: 12 }}
                >
                  <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer>
                      <BarChart data={semesterChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Enrolled" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Approved" fill="#16a34a" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Credited" fill="#0891b2" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="No Evaluation" fill="#dc2626" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Space>
            ),
          },
          {
            key: 'personal',
            label: (
              <span>
                <UserOutlined /> Personal, Family & Admission
              </span>
            ),
            children: (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Card title="Personal & Demographic Details" bordered={false} style={{ borderRadius: 12 }}>
                  <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="small">
                    <Descriptions.Item label="Student ID">{s.student_code}</Descriptions.Item>
                    <Descriptions.Item label="Gender">{formatFieldVal('gender')}</Descriptions.Item>
                    <Descriptions.Item label="Age at Enrollment">{s.age_at_enrollment}</Descriptions.Item>
                    <Descriptions.Item label="Marital Status">
                      {formatFieldVal('marital_status')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Nationality">
                      {formatFieldVal('nationality')}
                    </Descriptions.Item>
                    <Descriptions.Item label="International Student">
                      {formatFieldVal('international')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Displaced Student">
                      {formatFieldVal('displaced')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Educational Special Needs">
                      {formatFieldVal('educational_special_needs')}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card title="Admission & Prior Qualification" bordered={false} style={{ borderRadius: 12 }}>
                  <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
                    <Descriptions.Item label="Course / Program">{formatFieldVal('course')}</Descriptions.Item>
                    <Descriptions.Item label="Attendance Regime">
                      {formatFieldVal('daytime_evening_attendance')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Application Mode">
                      {formatFieldVal('application_mode')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Application Order">
                      Choice #{s.application_order}
                    </Descriptions.Item>
                    <Descriptions.Item label="Previous Qualification">
                      {formatFieldVal('previous_qualification')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Previous Qualification Grade">
                      {s.previous_qualification_grade} / 200
                    </Descriptions.Item>
                    <Descriptions.Item label="Admission Grade">
                      <strong>{s.admission_grade} / 200</strong>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card title="Family Background, Financial & Macroeconomic Context" bordered={false} style={{ borderRadius: 12 }}>
                  <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
                    <Descriptions.Item label="Mother's Qualification">
                      {formatFieldVal('mothers_qualification')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Father's Qualification">
                      {formatFieldVal('fathers_qualification')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Mother's Occupation">
                      {formatFieldVal('mothers_occupation')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Father's Occupation">
                      {formatFieldVal('fathers_occupation')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Tuition Fees Up to Date">
                      {formatFieldVal('tuition_fees_up_to_date')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Debtor Status">
                      {formatFieldVal('debtor')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Scholarship Holder">
                      {formatFieldVal('scholarship_holder')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Macroeconomic Indicators">
                      Unemployment: {s.unemployment_rate}% · Inflation: {s.inflation_rate}% · GDP: {s.gdp}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Space>
            ),
          },
          {
            key: 'history',
            label: (
              <span>
                <HistoryOutlined /> Evaluation History ({predictions.length})
              </span>
            ),
            children: (
              <Card bordered={false} style={{ borderRadius: 12 }}>
                <Table
                  rowKey="id"
                  dataSource={predictions}
                  pagination={{ pageSize: 10 }}
                  columns={[
                    {
                      title: 'Run ID',
                      dataIndex: 'id',
                      width: 100,
                      render: (id: number) => `#${id}`,
                    },
                    {
                      title: 'Evaluation Stage',
                      dataIndex: 'stage',
                      render: (st: string) => <Tag color="blue">{STAGE_LABELS[st] || st}</Tag>,
                    },
                    {
                      title: 'Risk Score',
                      dataIndex: 'risk_score',
                      render: (sc: number) => <strong>{(sc * 100).toFixed(0)}% ({sc})</strong>,
                    },
                    {
                      title: 'Risk Level',
                      dataIndex: 'risk_level',
                      render: (lv: string, r: PredictionOut) => renderRiskTag(lv, r.risk_score),
                    },
                    {
                      title: 'Predicted Outcome',
                      dataIndex: 'predicted_label',
                      render: (lb: string) => renderTargetTag(lb),
                    },
                    {
                      title: 'Evaluated By',
                      dataIndex: 'evaluator_name',
                      render: (n: string, r: PredictionOut) => n || `User #${r.evaluated_by}`,
                    },
                    {
                      title: 'Timestamp',
                      dataIndex: 'created_at',
                      render: (dt: string) => new Date(dt).toLocaleString('en-US'),
                    },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* Admin Edit Student Modal */}
      <Modal
        title={`Edit Student Record – ${s.student_code}`}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        width={960}
        footer={null}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateStudent}>
          <Form.Item name="target" label="Academic Outcome">
            <Select
              allowClear
              options={[
                { value: 'Enrolled', label: 'Enrolled' },
                { value: 'Graduate', label: 'Graduate' },
                { value: 'Dropout', label: 'Dropout' },
              ]}
            />
          </Form.Item>
          <Collapse
            defaultActiveKey={['financial', 'semester_1', 'semester_2']}
            items={Object.entries(groupedFields).map(([grp, fields]) => ({
              key: grp,
              forceRender: true,
              label: <strong>{GROUP_LABELS[grp] || grp}</strong>,
              children: <MetaFormItems fields={fields} colSpan={8} />,
            }))}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={savingEdit}>
              Save Changes
            </Button>
          </div>
        </Form>
      </Modal>
    </Space>
  );
};
