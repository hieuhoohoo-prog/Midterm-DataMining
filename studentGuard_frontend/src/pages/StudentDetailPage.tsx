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
  DollarOutlined,
  EditOutlined,
  HistoryOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  WarningOutlined,
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
      message.error(err.response?.data?.detail || 'Không tìm thấy hồ sơ sinh viên');
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
      message.success(`Đã chạy và lưu kết quả đánh giá (${STAGE_LABELS[riskStage]})!`);
      loadStudentData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Lỗi khi chạy dự đoán');
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
      await api.put(`/api/students/${code}`, values);
      message.success('Đã cập nhật hồ sơ sinh viên!');
      setEditOpen(false);
      loadStudentData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Cập nhật thất bại');
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
      name: 'Học kỳ 1',
      'Đăng ký': profile.semester_1.enrolled,
      'Đạt (Approved)': profile.semester_1.approved,
      'Được công nhận': profile.semester_1.credited,
      'Không dự thi': profile.semester_1.without_evaluations,
    },
    {
      name: 'Học kỳ 2',
      'Đăng ký': profile.semester_2.enrolled,
      'Đạt (Approved)': profile.semester_2.approved,
      'Được công nhận': profile.semester_2.credited,
      'Không dự thi': profile.semester_2.without_evaluations,
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
          { title: <Link to="/">Tổng quan</Link> },
          { title: <Link to="/students">Hồ sơ Sinh viên</Link> },
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
                    Sinh viên {s.student_code}
                  </Title>
                  {renderTargetTag(s.target)}
                  {profile.latest_prediction &&
                    renderRiskTag(
                      profile.latest_prediction.risk_level,
                      profile.latest_prediction.risk_score
                    )}
                </Space>
                <div style={{ marginTop: 6, color: '#475569', fontSize: 14 }}>
                  <strong>Ngành đào tạo:</strong> {lbl.course || `Mã ngành ${s.course}`} ({s.course})
                  {' · '}
                  <strong>Hệ:</strong> {lbl.daytime_evening_attendance || s.daytime_evening_attendance}
                </div>
                <Space size={6} style={{ marginTop: 10 }} wrap>
                  <Tag color={s.gender === 1 ? 'geekblue' : 'magenta'}>
                    Giới tính: {lbl.gender || s.gender}
                  </Tag>
                  <Tag>Tuổi nhập học: {s.age_at_enrollment}</Tag>
                  <Tag color={s.tuition_fees_up_to_date === 1 ? 'success' : 'error'}>
                    Học phí: {lbl.tuition_fees_up_to_date}
                  </Tag>
                  <Tag color={s.debtor === 1 ? 'warning' : 'default'}>
                    Công nợ: {lbl.debtor}
                  </Tag>
                  <Tag color={s.scholarship_holder === 1 ? 'cyan' : 'default'}>
                    Học bổng: {lbl.scholarship_holder}
                  </Tag>
                </Space>
              </div>
            </Space>
          </Col>

          <Col xs={24} lg={9} style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Space wrap>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/students')}>
                Danh sách
              </Button>
              {user?.role === 'Admin' && (
                <Button icon={<EditOutlined />} onClick={openEditModal}>
                  Chỉnh sửa hồ sơ
                </Button>
              )}
              <Button
                type="primary"
                icon={<AlertOutlined />}
                onClick={() => navigate(`/predict?student=${s.student_code}`)}
              >
                Mở Bộ mô phỏng Dự đoán
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
                <SafetyCertificateOutlined /> Phân tích Nguy cơ & Khuyến nghị Học vụ
              </span>
            ),
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={8}>
                  <Card
                    title="Chỉ số Nguy cơ Bỏ học"
                    extra={
                      <Segmented
                        size="small"
                        value={riskStage}
                        onChange={(v) => setRiskStage(v as any)}
                        options={[
                          { value: 'enrollment', label: 'Nhập học' },
                          { value: 'semester_1', label: 'Kỳ 1' },
                          { value: 'semester_2', label: 'Kỳ 2' },
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
                            Lưu kết quả đánh giá ({STAGE_LABELS[riskStage]}) vào Nhật ký
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
                      title="Giải thích các Yếu tố Tác động đến Điểm Rủi ro (Explainable Factors)"
                      bordered={false}
                      style={{ borderRadius: 12 }}
                    >
                      {riskExplain && riskExplain.factors.length === 0 ? (
                        <Alert
                          type="success"
                          showIcon
                          message="Không phát hiện yếu tố cảnh báo bất thường ở giai đoạn này."
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
                                      +{Math.round(f.weight * 100)}% rủi ro
                                    </Tag>
                                  ) : f.impact === 'decrease' ? (
                                    <Tag color="success">Yếu tố tích cực</Tag>
                                  ) : (
                                    <Tag color="warning">Lưu ý ngữ cảnh</Tag>
                                  )
                                }
                                title={
                                  <Text strong>
                                    {f.label}{' '}
                                    <Text type="secondary" style={{ fontWeight: 400 }}>
                                      (Giá trị hiện tại: {f.value})
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
                      title="Khuyến nghị Hành động cho Cố vấn Học tập"
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
                <BookOutlined /> Kết quả Học tập (Học kỳ 1 & 2)
              </span>
            ),
            children: (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {profile.semester_1.enrolled === 0 && profile.semester_2.enrolled === 0 && (
                  <Alert
                    type="warning"
                    showIcon
                    message="Sinh viên không đăng ký học phần nào trong cả 2 học kỳ (0 học phần)"
                    description="Theo dữ liệu tuyển sinh & đào tạo, sinh viên này đã hoàn tất nhập học nhưng thôi học ngay từ đầu năm (không đăng ký tín chỉ và không dự thi bất kỳ môn học nào)."
                  />
                )}
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Card title="Tổng kết Học kỳ 1" bordered={false} style={{ borderRadius: 12 }}>
                      <Row gutter={16}>
                        <Col span={8}>
                          <Statistic
                            title="Điểm TB HK1"
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
                            title="Số học phần Đạt"
                            value={profile.semester_1.approved}
                            suffix={`/ ${profile.semester_1.enrolled}`}
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic
                            title="Số lượt dự thi"
                            value={profile.semester_1.evaluations}
                          />
                        </Col>
                      </Row>
                      <div style={{ marginTop: 16 }}>
                        <Text type="secondary">Tỷ lệ hoàn thành học phần HK1:</Text>
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
                    <Card title="Tổng kết Học kỳ 2" bordered={false} style={{ borderRadius: 12 }}>
                      <Row gutter={16}>
                        <Col span={8}>
                          <Statistic
                            title="Điểm TB HK2"
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
                            title="Số học phần Đạt"
                            value={profile.semester_2.approved}
                            suffix={`/ ${profile.semester_2.enrolled}`}
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic
                            title="Số lượt dự thi"
                            value={profile.semester_2.evaluations}
                          />
                        </Col>
                      </Row>
                      <div style={{ marginTop: 16 }}>
                        <Text type="secondary">Tỷ lệ hoàn thành học phần HK2:</Text>
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
                  title="Biểu đồ Đối chiếu Học phần Đăng ký vs Đạt qua 2 Học kỳ"
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
                        <Bar dataKey="Đăng ký" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Đạt (Approved)" fill="#16a34a" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Được công nhận" fill="#0891b2" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Không dự thi" fill="#dc2626" radius={[4, 4, 0, 0]} />
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
                <UserOutlined /> Lý lịch, Gia đình & Tuyển sinh
              </span>
            ),
            children: (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Card title="Thông tin Cá nhân & Nhân khẩu học" bordered={false} style={{ borderRadius: 12 }}>
                  <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="small">
                    <Descriptions.Item label="Mã sinh viên">{s.student_code}</Descriptions.Item>
                    <Descriptions.Item label="Giới tính">{formatFieldVal('gender')}</Descriptions.Item>
                    <Descriptions.Item label="Tuổi khi nhập học">{s.age_at_enrollment}</Descriptions.Item>
                    <Descriptions.Item label="Tình trạng hôn nhân">
                      {formatFieldVal('marital_status')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Quốc tịch">
                      {formatFieldVal('nationality')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Sinh viên quốc tế">
                      {formatFieldVal('international')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Học xa nơi cư trú">
                      {formatFieldVal('displaced')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Nhu cầu giáo dục đặc biệt">
                      {formatFieldVal('educational_special_needs')}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card title="Thông tin Tuyển sinh & Đầu vào" bordered={false} style={{ borderRadius: 12 }}>
                  <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
                    <Descriptions.Item label="Ngành học">{formatFieldVal('course')}</Descriptions.Item>
                    <Descriptions.Item label="Hình thức học">
                      {formatFieldVal('daytime_evening_attendance')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Phương thức tuyển sinh">
                      {formatFieldVal('application_mode')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Thứ tự nguyện vọng">
                      Nguyện vọng {s.application_order}
                    </Descriptions.Item>
                    <Descriptions.Item label="Trình độ trước nhập học">
                      {formatFieldVal('previous_qualification')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Điểm trình độ trước">
                      {s.previous_qualification_grade} / 200
                    </Descriptions.Item>
                    <Descriptions.Item label="Điểm trúng tuyển đầu vào">
                      <strong>{s.admission_grade} / 200</strong>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card title="Nền tảng Gia đình, Tài chính & Vĩ mô" bordered={false} style={{ borderRadius: 12 }}>
                  <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
                    <Descriptions.Item label="Trình độ của Mẹ">
                      {formatFieldVal('mothers_qualification')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Trình độ của Cha">
                      {formatFieldVal('fathers_qualification')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Nghề nghiệp của Mẹ">
                      {formatFieldVal('mothers_occupation')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Nghề nghiệp của Cha">
                      {formatFieldVal('fathers_occupation')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Đóng học phí đúng hạn">
                      {formatFieldVal('tuition_fees_up_to_date')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Tình trạng công nợ">
                      {formatFieldVal('debtor')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Diện nhận học bổng">
                      {formatFieldVal('scholarship_holder')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Bối cảnh vĩ mô">
                      Thất nghiệp: {s.unemployment_rate}% · Lạm phát: {s.inflation_rate}% · GDP: {s.gdp}
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
                <HistoryOutlined /> Lịch sử Đánh giá ({predictions.length})
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
                      title: 'Mã lần chạy',
                      dataIndex: 'id',
                      width: 100,
                      render: (id: number) => `#${id}`,
                    },
                    {
                      title: 'Giai đoạn đánh giá',
                      dataIndex: 'stage',
                      render: (st: string) => <Tag color="blue">{STAGE_LABELS[st] || st}</Tag>,
                    },
                    {
                      title: 'Điểm rủi ro',
                      dataIndex: 'risk_score',
                      render: (sc: number) => <strong>{(sc * 100).toFixed(0)}% ({sc})</strong>,
                    },
                    {
                      title: 'Mức cảnh báo',
                      dataIndex: 'risk_level',
                      render: (lv: string, r: PredictionOut) => renderRiskTag(lv, r.risk_score),
                    },
                    {
                      title: 'Dự báo xu hướng',
                      dataIndex: 'predicted_label',
                      render: (lb: string) => renderTargetTag(lb),
                    },
                    {
                      title: 'Người đánh giá',
                      dataIndex: 'evaluator_name',
                      render: (n: string, r: PredictionOut) => n || `User #${r.evaluated_by}`,
                    },
                    {
                      title: 'Thời gian',
                      dataIndex: 'created_at',
                      render: (dt: string) => new Date(dt).toLocaleString('vi-VN'),
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
        title={`Chỉnh sửa Hồ sơ Sinh viên ${s.student_code}`}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        width={960}
        footer={null}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateStudent}>
          <Form.Item name="target" label="Trạng thái học vụ">
            <Select
              allowClear
              options={[
                { value: 'Enrolled', label: 'Đang theo học (Enrolled)' },
                { value: 'Graduate', label: 'Tốt nghiệp (Graduate)' },
                { value: 'Dropout', label: 'Thôi học (Dropout)' },
              ]}
            />
          </Form.Item>
          <Collapse
            defaultActiveKey={['financial', 'semester_1', 'semester_2']}
            items={Object.entries(groupedFields).map(([grp, fields]) => ({
              key: grp,
              label: <strong>{GROUP_LABELS[grp] || grp}</strong>,
              children: <MetaFormItems fields={fields} colSpan={8} />,
            }))}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={() => setEditOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={savingEdit}>
              Lưu thay đổi
            </Button>
          </div>
        </Form>
      </Modal>
    </Space>
  );
};

