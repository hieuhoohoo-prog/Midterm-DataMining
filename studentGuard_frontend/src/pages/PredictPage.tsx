import React, { useEffect, useState } from 'react';
import {
  Alert,
  AutoComplete,
  Button,
  Card,
  Col,
  Collapse,
  Divider,
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
  const [searchOptions, setSearchOptions] = useState<{ value: string; label: React.ReactNode }[]>([]);
  const [stageIdx, setStageIdx] = useState<number>(2); // default semester_2
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<PredictionOut | null>(null);
  const [explain, setExplain] = useState<RiskExplanation | null>(null);

  const stage = STAGE_ORDER[stageIdx];

  const loadStudentIntoForm = async (code: string) => {
    try {
      const [stuRes, expRes] = await Promise.all([
        api.get<StudentRecord>(`/api/students/${code}`),
        api.get<RiskExplanation>(`/api/students/${code}/risk-factors`, {
          params: { stage },
        }),
      ]);
      form.setFieldsValue(stuRes.data);
      setStudentCode(stuRes.data.student_code);
      setExplain(expRes.data);
    } catch {
      message.warning(`Không tìm thấy mã SV ${code} để điền tự động, bạn có thể nhập thủ công.`);
    }
  };

  useEffect(() => {
    loadStudentIntoForm(initialStudent);
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
                <strong>{item.student_code}</strong> – {item.course_name || `Ngành #${item.course}`}
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

  const handleRunPrediction = async (values: any) => {
    setSubmitting(true);
    try {
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

      // Build live explanation from current form values (supports What-If simulation!)
      const factors: RiskExplanation['factors'] = [];
      if (values.tuition_fees_up_to_date === 0) {
        factors.push({
          key: 'tuition_fees_up_to_date',
          label: 'Học phí đúng hạn',
          value: 0,
          weight: 0.35,
          impact: 'increase',
          description: 'Chưa đóng học phí đúng hạn (+35% nguy cơ bỏ học).',
        });
      }
      if (values.debtor === 1) {
        factors.push({
          key: 'debtor',
          label: 'Đang nợ',
          value: 1,
          weight: 0.2,
          impact: 'increase',
          description: 'Sinh viên đang có khoản công nợ (+20% nguy cơ bỏ học).',
        });
      }
      if (
        (stage === 'semester_1' || stage === 'semester_2') &&
        Number(values.curricular_units_1st_sem_grade ?? 20) < 10
      ) {
        factors.push({
          key: 'curricular_units_1st_sem_grade',
          label: 'Điểm TB Học kỳ 1',
          value: values.curricular_units_1st_sem_grade,
          weight: 0.25,
          impact: 'increase',
          description: 'Điểm trung bình Học kỳ 1 dưới 10/20 (+25% nguy cơ bỏ học).',
        });
      }
      if (values.scholarship_holder === 1) {
        factors.push({
          key: 'scholarship_holder',
          label: 'Có học bổng',
          value: 1,
          weight: 0,
          impact: 'decrease',
          description: 'Sinh viên thuộc diện có học bổng (yếu tố giảm thiểu rủi ro).',
        });
      }

      const suggestions: string[] = [];
      if (values.tuition_fees_up_to_date === 0 || values.debtor === 1) {
        suggestions.push('Liên hệ phòng Tài chính hỗ trợ gia hạn hoặc chia nhỏ đợt đóng học phí.');
        suggestions.push('Tư vấn các gói học bổng khuyến khích / hỗ trợ sinh viên khó khăn.');
      }
      if (
        (stage === 'semester_1' || stage === 'semester_2') &&
        Number(values.curricular_units_1st_sem_grade ?? 20) < 10
      ) {
        suggestions.push('Đặt lịch tư vấn học tập 1-1 và điều chỉnh khối lượng tín chỉ kỳ tới.');
      }
      if (suggestions.length === 0) {
        suggestions.push('Tiếp tục duy trì tiến độ học tập và theo dõi định kỳ mỗi cuối kỳ.');
      }

      setExplain({
        student_code: code,
        stage,
        base_score: 0.15,
        estimated_score: res.data.risk_score,
        risk_level: res.data.risk_level,
        factors,
        suggestions,
        note: 'Kết quả đã được lưu vào Nhật ký đánh giá.',
      });

      message.success(`Đã đánh giá nguy cơ cho ${code} ở mốc ${STAGE_LABELS[stage]}!`);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Không thể chạy dự đoán');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
          Đánh giá & Mô phỏng Nguy cơ Học vụ (3 Giai đoạn)
        </Title>
        <Text type="secondary">
          Chọn một sinh viên trong hệ thống để nạp tự động dữ liệu hoặc điều chỉnh thông số ("What-if")
          để kiểm tra mức độ thay đổi rủi ro bỏ học.
        </Text>
      </div>

      {/* Stepper Card */}
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Row gutter={[20, 16]} align="middle">
          <Col xs={24} lg={9}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              1. Chọn sinh viên cần đánh giá (tự động nạp hồ sơ):
            </Text>
            <Space.Compact style={{ width: '100%' }}>
              <AutoComplete
                value={studentCode}
                options={searchOptions}
                onSearch={handleStudentSearch}
                onSelect={(val) => loadStudentIntoForm(val)}
                style={{ width: '100%' }}
              >
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="Nhập mã SV (VD: SV0001, SV0012...)"
                />
              </AutoComplete>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => loadStudentIntoForm(studentCode)}
              >
                Nạp hồ sơ
              </Button>
              <Button
                icon={<UserOutlined />}
                onClick={() => navigate(`/students/${studentCode}`)}
              >
                Xem HS
              </Button>
            </Space.Compact>
          </Col>

          <Col xs={24} lg={15}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              2. Chọn mốc thời gian dự báo (chống rò rỉ dữ liệu – Data Leakage):
            </Text>
            <Steps
              current={stageIdx}
              onChange={(idx) => setStageIdx(idx)}
              size="small"
              items={[
                {
                  title: 'Khi nhập học',
                  description: '24 chỉ số đầu vào',
                },
                {
                  title: 'Sau Học kỳ 1',
                  description: '30 chỉ số (+6 cột HK1)',
                },
                {
                  title: 'Sau Học kỳ 2',
                  description: '36 chỉ số (+6 cột HK2)',
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
                <span>Thông số Đầu vào Mô hình</span>
                <Tag color="blue" style={{ margin: 0, fontWeight: 600 }}>
                  Giai đoạn: {STAGE_LABELS[stage]}
                </Tag>
              </Space>
            }
            extra={
              <Button
                type="primary"
                icon={<AlertOutlined />}
                loading={submitting}
                onClick={() => form.submit()}
                style={{ marginLeft: 12 }}
              >
                Chạy Dự đoán & Lưu kết quả
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
                  label: (
                    <Space>
                      <strong>{GROUP_LABELS[grp] || grp}</strong>
                      <Tag>{fields.length} chỉ số</Tag>
                    </Space>
                  ),
                  children: <MetaFormItems fields={fields} colSpan={8} />,
                }))}
              />

              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <Button
                  type="primary"
                  size="large"
                  htmlType="submit"
                  icon={<AlertOutlined />}
                  loading={submitting}
                >
                  Chạy Dự đoán Nguy cơ ({STAGE_LABELS[stage]})
                </Button>
              </div>
            </Form>
          </Card>
        </Col>

        {/* Right: Prediction Result & Explanation */}
        <Col xs={24} lg={9}>
          <Card
            title="Kết quả Đánh giá & Giải thích Yếu tố"
            bordered={false}
            style={{ borderRadius: 12, position: 'sticky', top: 84 }}
          >
            {explain ? (
              <>
                <RiskGauge
                  score={result ? result.risk_score : explain.estimated_score}
                  level={result ? result.risk_level : explain.risk_level}
                />

                {result && (
                  <Alert
                    type="success"
                    showIcon
                    style={{ marginTop: 12 }}
                    message={`Đã lưu bản ghi đánh giá #${result.id} cho ${result.student_code}`}
                    description={`Nhãn xu hướng dự báo: ${result.predicted_label}`}
                  />
                )}

                <Divider style={{ margin: '16px 0 12px' }} orientation="left">
                  Yếu tố tác động chính
                </Divider>

                {explain.factors.length === 0 ? (
                  <Alert
                    type="success"
                    showIcon
                    message="Không có yếu tố rủi ro tài chính hoặc điểm số thấp."
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
                                <Tag color="error">+{Math.round(f.weight * 100)}%</Tag>
                              ) : (
                                <Tag color="success">Giảm nhẹ</Tag>
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
                  Khuyến nghị can thiệp
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
              <Alert
                type="info"
                showIcon
                message="Nhấn 'Chạy Dự đoán' để tính điểm rủi ro bỏ học."
              />
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

