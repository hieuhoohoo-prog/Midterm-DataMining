import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Row,
  Segmented,
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  AlertOutlined,
  ArrowRightOutlined,
  BankOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import {
  GroupRateItem,
  HistogramBin,
  OverviewStats,
  StudentListItem,
  StudentPage,
} from '../types';
import { renderRiskTag, renderTargetTag, TARGET_SHORT_LABELS } from '../utils/ui';

const { Title, Text } = Typography;

const TARGET_COLORS: Record<string, string> = {
  Graduate: '#16a34a',
  Enrolled: '#2563eb',
  Dropout: '#dc2626',
};

const GROUP_FIELD_OPTIONS = [
  { value: 'tuition_fees_up_to_date', label: 'Tình trạng đóng học phí' },
  { value: 'debtor', label: 'Tình trạng công nợ' },
  { value: 'scholarship_holder', label: ' Diện nhận học bổng' },
  { value: 'gender', label: 'Giới tính' },
  { value: 'daytime_evening_attendance', label: 'Ca học (Ban ngày / Buổi tối)' },
  { value: 'course', label: 'Ngành đào tạo (Top ngành)' },
];

const HISTOGRAM_FIELD_OPTIONS = [
  { value: 'curricular_units_1st_sem_grade', label: 'Điểm TB Học kỳ 1 (0–20)' },
  { value: 'curricular_units_2nd_sem_grade', label: 'Điểm TB Học kỳ 2 (0–20)' },
  { value: 'admission_grade', label: 'Điểm trúng tuyển đầu vào (0–200)' },
  { value: 'age_at_enrollment', label: 'Độ tuổi khi nhập học' },
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [groupField, setGroupField] = useState<string>('tuition_fees_up_to_date');
  const [groupData, setGroupData] = useState<GroupRateItem[]>([]);
  const [histField, setHistField] = useState<string>('curricular_units_1st_sem_grade');
  const [histData, setHistData] = useState<HistogramBin[]>([]);
  const [priorityStudents, setPriorityStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      try {
        const [ovRes, stuRes] = await Promise.all([
          api.get<OverviewStats>('/api/stats/overview'),
          api.get<StudentPage>('/api/search/students', {
            params: {
              tuition_fees_up_to_date: 0,
              debtor: 1,
              sort_by: 'curricular_units_1st_sem_grade',
              order: 'asc',
              page_size: 8,
            },
          }),
        ]);
        setOverview(ovRes.data);
        setPriorityStudents(stuRes.data.items);
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, []);

  useEffect(() => {
    api
      .get<GroupRateItem[]>('/api/stats/group-by', { params: { field: groupField } })
      .then((res) => setGroupData(res.data.slice(0, 8)));
  }, [groupField]);

  useEffect(() => {
    api
      .get<HistogramBin[]>('/api/stats/histogram', { params: { field: histField } })
      .then((res) => setHistData(res.data));
  }, [histField]);

  if (loading || !overview) {
    return <Skeleton active paragraph={{ rows: 12 }} />;
  }

  const pieData = Object.entries(overview.by_target).map(([key, value]) => ({
    name: TARGET_SHORT_LABELS[key] || key,
    key,
    value,
    pct: ((overview.target_rate[key] || 0) * 100).toFixed(1),
  }));

  const barChartData = groupData.map((g) => ({
    name: g.label || `Mã ${g.value}`,
    total: g.total,
    'Thôi học (%)': Number(((g.rates.Dropout || 0) * 100).toFixed(1)),
    'Đang học (%)': Number(((g.rates.Enrolled || 0) * 100).toFixed(1)),
    'Tốt nghiệp (%)': Number(((g.rates.Graduate || 0) * 100).toFixed(1)),
  }));

  const histChartData = histData.map((b) => ({
    range: `${b.start}–${b.end}`,
    'Thôi học': b.counts.Dropout || 0,
    'Đang học': b.counts.Enrolled || 0,
    'Tốt nghiệp': b.counts.Graduate || 0,
  }));

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      {/* Page Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
            Bảng điều khiển Học vụ & Cảnh báo sớm
          </Title>
          <Text type="secondary">
            Tổng hợp dữ liệu đào tạo toàn trường, phân tích yếu tố rủi ro bỏ học và danh sách sinh
            viên cần cố vấn hỗ trợ.
          </Text>
        </div>
        <Space>
          <Button icon={<FileSearchOutlined />} onClick={() => navigate('/students')}>
            Danh sách sinh viên
          </Button>
          <Button
            type="primary"
            icon={<AlertOutlined />}
            onClick={() => navigate('/predict')}
          >
            Đánh giá nguy cơ học vụ
          </Button>
        </Space>
      </div>

      {/* KPI Row */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <Statistic
              title={<Text type="secondary">Tổng quy mô Sinh viên</Text>}
              value={overview.total_students}
              prefix={<TeamOutlined style={{ color: '#2563eb' }} />}
              suffix={<Text type="secondary" style={{ fontSize: 13 }}>/ {overview.total_courses} ngành</Text>}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
              Điểm TB đầu vào: <strong>{overview.averages.admission_grade}</strong>/200 · Tuổi TB:{' '}
              <strong>{overview.averages.age_at_enrollment}</strong>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <Statistic
              title={<Text type="secondary">Sinh viên Thôi học (Dropout)</Text>}
              value={overview.by_target.Dropout || 0}
              valueStyle={{ color: '#dc2626', fontWeight: 700 }}
              prefix={<ExclamationCircleOutlined />}
              suffix={
                <Tag color="error" style={{ marginLeft: 8 }}>
                  {((overview.target_rate.Dropout || 0) * 100).toFixed(1)}%
                </Tag>
              }
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
              Đang theo học: <strong>{overview.by_target.Enrolled}</strong> (
              {((overview.target_rate.Enrolled || 0) * 100).toFixed(1)}%)
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <Statistic
              title={<Text type="secondary">Tốt nghiệp đúng hạn (Graduate)</Text>}
              value={overview.by_target.Graduate || 0}
              valueStyle={{ color: '#16a34a', fontWeight: 700 }}
              prefix={<CheckCircleOutlined />}
              suffix={
                <Tag color="success" style={{ marginLeft: 8 }}>
                  {((overview.target_rate.Graduate || 0) * 100).toFixed(1)}%
                </Tag>
              }
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
              Điểm TB HK1: <strong>{overview.averages.semester_1_grade}</strong> · HK2:{' '}
              <strong>{overview.averages.semester_2_grade}</strong>/20
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <Statistic
              title={<Text type="secondary">Cảnh báo Tài chính & Học phí</Text>}
              value={overview.financial.tuition_not_up_to_date}
              valueStyle={{ color: '#d97706', fontWeight: 700 }}
              prefix={<DollarOutlined />}
              suffix={<Text type="secondary" style={{ fontSize: 13 }}>SV trễ học phí</Text>}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
              Đang nợ: <strong>{overview.financial.debtors}</strong> · Có học bổng:{' '}
              <strong>{overview.financial.scholarship_holders}</strong>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Key Data Mining Insights Callout */}
      <Alert
        type="info"
        showIcon
        icon={<BankOutlined />}
        message={
          <span style={{ fontWeight: 600 }}>
            Phát hiện cốt lõi từ Khai phá dữ liệu (EDA Insights):
          </span>
        }
        description={
          <div style={{ fontSize: 13, color: '#334155' }}>
            Nhóm sinh viên <strong>chưa đóng học phí đúng hạn</strong> có tỷ lệ bỏ học lên tới{' '}
            <Tag color="error">86.6%</Tag> (so với 24.7% ở nhóm đóng đúng hạn). Sinh viên{' '}
            <strong>đang có khoản nợ</strong> có tỷ lệ bỏ học <Tag color="warning">62.0%</Tag>,
            trong khi nhóm <strong>có học bổng</strong> chỉ ở mức <Tag color="success">12.2%</Tag>.
          </div>
        }
        style={{ borderRadius: 12 }}
      />

      {/* Charts Row 1: Target Donut + Group Rate Bar Chart */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={9}>
          <Card
            title="Phân bố Trạng thái Học vụ toàn trường"
            bordered={false}
            style={{ borderRadius: 12, height: '100%' }}
          >
            <div style={{ width: '100%', height: 290 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={98}
                    paddingAngle={3}
                    label={({ name, pct }) => `${name}: ${pct}%`}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.key} fill={TARGET_COLORS[entry.key] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => [`${val.toLocaleString()} sinh viên`, 'Số lượng']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={15}>
          <Card
            title="Tỷ lệ Thôi học / Tốt nghiệp theo Nhóm yếu tố (%)"
            extra={
              <Select
                value={groupField}
                onChange={setGroupField}
                options={GROUP_FIELD_OPTIONS}
                style={{ width: 250 }}
              />
            }
            bordered={false}
            style={{ borderRadius: 12, height: '100%' }}
          >
            <div style={{ width: '100%', height: 290 }}>
              <ResponsiveContainer>
                <BarChart data={barChartData} margin={{ top: 10, right: 16, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-12} textAnchor="end" />
                  <YAxis unit="%" tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Legend />
                  <Bar dataKey="Thôi học (%)" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Đang học (%)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Tốt nghiệp (%)" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Chart Row 2: Numeric Distribution Histogram */}
      <Card
        title="Phân bố Điểm số & Độ tuổi theo Kết quả Học vụ"
        extra={
          <Segmented
            value={histField}
            onChange={(val) => setHistField(String(val))}
            options={HISTOGRAM_FIELD_OPTIONS}
          />
        }
        bordered={false}
        style={{ borderRadius: 12 }}
      >
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={histChartData} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="range" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Tốt nghiệp" stackId="a" fill="#16a34a" />
              <Bar dataKey="Đang học" stackId="a" fill="#2563eb" />
              <Bar dataKey="Thôi học" stackId="a" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Priority Intervention Roster */}
      <Card
        title={
          <Space>
            <WarningOutlined style={{ color: '#dc2626' }} />
            <span>Danh sách Sinh viên Cần Cố vấn Học tập Chú ý (Nợ học phí & Điểm HK1 thấp)</span>
          </Space>
        }
        extra={
          <Button
            type="link"
            icon={<ArrowRightOutlined />}
            onClick={() => navigate('/students?tuition_fees_up_to_date=0&debtor=1')}
          >
            Xem toàn bộ danh sách lọc
          </Button>
        }
        bordered={false}
        style={{ borderRadius: 12 }}
      >
        <Table
          rowKey="student_code"
          dataSource={priorityStudents}
          pagination={false}
          size="middle"
          columns={[
            {
              title: 'Mã SV',
              dataIndex: 'student_code',
              width: 100,
              render: (code: string) => (
                <Button
                  type="link"
                  style={{ padding: 0, fontWeight: 600 }}
                  onClick={() => navigate(`/students/${code}`)}
                >
                  {code}
                </Button>
              ),
            },
            {
              title: 'Ngành đào tạo',
              dataIndex: 'course_name',
              render: (name: string, r: StudentListItem) => name || `Mã ngành ${r.course}`,
            },
            {
              title: 'Tuổi',
              dataIndex: 'age_at_enrollment',
              width: 70,
              align: 'center',
            },
            {
              title: 'Tài chính',
              key: 'finance',
              render: (_: any, r: StudentListItem) => (
                <Space size={4} wrap>
                  {r.tuition_fees_up_to_date === 0 && <Tag color="error">Trễ học phí</Tag>}
                  {r.debtor === 1 && <Tag color="warning">Đang nợ</Tag>}
                  {r.scholarship_holder === 1 && <Tag color="success">Học bổng</Tag>}
                </Space>
              ),
            },
            {
              title: 'Điểm TB HK1',
              dataIndex: 'curricular_units_1st_sem_grade',
              width: 120,
              align: 'right',
              render: (g: number) => (
                <Text strong style={{ color: g < 10 ? '#dc2626' : '#0f172a' }}>
                  {g.toFixed(2)} / 20
                </Text>
              ),
            },
            {
              title: 'Trạng thái gốc',
              dataIndex: 'target',
              width: 130,
              render: (t: string) => renderTargetTag(t),
            },
            {
              title: 'Đánh giá gần nhất',
              key: 'risk',
              width: 170,
              render: (_: any, r: StudentListItem) =>
                renderRiskTag(r.latest_risk_level, r.latest_risk_score),
            },
            {
              title: 'Thao tác',
              key: 'action',
              width: 190,
              align: 'right',
              render: (_: any, r: StudentListItem) => (
                <Space>
                  <Button size="small" onClick={() => navigate(`/students/${r.student_code}`)}>
                    Hồ sơ
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    onClick={() => navigate(`/predict?student=${r.student_code}`)}
                  >
                    Dự đoán
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
};

