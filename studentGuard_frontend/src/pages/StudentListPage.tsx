import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Collapse,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  AlertOutlined,
  EyeOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FieldMeta, StudentListItem, StudentPage } from '../types';
import { GROUP_LABELS, renderRiskTag, renderTargetTag } from '../utils/ui';
import { MetaFormItems } from '../components/MetaFormItems';

const { Title, Text } = Typography;

export const StudentListPage: React.FC = () => {
  const { user, meta } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<StudentPage | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Filters
  const [q, setQ] = useState<string>(searchParams.get('q') || '');
  const [target, setTarget] = useState<string | undefined>(
    searchParams.get('target') || undefined
  );
  const [course, setCourse] = useState<number | undefined>(
    searchParams.get('course') ? Number(searchParams.get('course')) : undefined
  );
  const [tuition, setTuition] = useState<number | undefined>(
    searchParams.get('tuition_fees_up_to_date') !== null
      ? Number(searchParams.get('tuition_fees_up_to_date'))
      : undefined
  );
  const [debtor, setDebtor] = useState<number | undefined>(
    searchParams.get('debtor') !== null ? Number(searchParams.get('debtor')) : undefined
  );
  const [scholarship, setScholarship] = useState<number | undefined>(undefined);
  const [riskLevel, setRiskLevel] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>('student_code');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Create student modal (Admin only)
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm();

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get<StudentPage>('/api/search/students', {
        params: {
          q: q.trim() || undefined,
          target,
          course,
          tuition_fees_up_to_date: tuition,
          debtor,
          scholarship_holder: scholarship,
          risk_level: riskLevel,
          sort_by: sortBy,
          order,
          page,
          page_size: pageSize,
        },
      });
      setData(res.data);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Không thể tải danh sách sinh viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const queryParam = searchParams.get('q');
    if (queryParam !== null && queryParam !== q) {
      setQ(queryParam);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchStudents();
  }, [q, target, course, tuition, debtor, scholarship, riskLevel, sortBy, order, page, pageSize]);

  const handleResetFilters = () => {
    setQ('');
    setTarget(undefined);
    setCourse(undefined);
    setTuition(undefined);
    setDebtor(undefined);
    setScholarship(undefined);
    setRiskLevel(undefined);
    setSortBy('student_code');
    setOrder('asc');
    setPage(1);
    setSearchParams({});
  };

  const courseOptions =
    meta?.fields
      .find((f) => f.name === 'course')
      ?.options?.map((o) => ({ value: o.value, label: `${o.label} (${o.value})` })) || [];

  const openCreateModal = async () => {
    // Pre-fill defaults from SV0001 so Admin doesn't have to type all 36 fields from scratch
    try {
      const res = await api.get('/api/students/SV0001');
      const { id, student_code, ...rest } = res.data;
      createForm.setFieldsValue({ ...rest, student_code: '', target: 'Enrolled' });
    } catch {
      createForm.resetFields();
    }
    setCreateOpen(true);
  };

  const handleCreateStudent = async (values: any) => {
    setCreating(true);
    try {
      const payload = { ...values };
      if (!payload.student_code || !payload.student_code.trim()) {
        delete payload.student_code;
      }
      const res = await api.post('/api/students', payload);
      message.success(`Đã tạo hồ sơ sinh viên ${res.data.student_code}`);
      setCreateOpen(false);
      navigate(`/students/${res.data.student_code}`);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Không thể tạo hồ sơ sinh viên');
    } finally {
      setCreating(false);
    }
  };

  const groupedFields = (meta?.fields || []).reduce<Record<string, FieldMeta[]>>((acc, f) => {
    acc[f.group] = acc[f.group] || [];
    acc[f.group].push(f);
    return acc;
  }, {});

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
            Quản lý Hồ sơ Sinh viên
          </Title>
          <Text type="secondary">
            Tra cứu, lọc theo ngành đào tạo, tình trạng đóng học phí, kết quả học tập và mức độ
            nguy cơ học vụ.
          </Text>
        </div>
        {user?.role === 'Admin' && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Thêm hồ sơ sinh viên
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={7}>
            <Input
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Tìm mã SV (SV0001...) hoặc tên ngành..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              allowClear
            />
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Ngành đào tạo (17 ngành)"
              style={{ width: '100%' }}
              value={course}
              onChange={(v) => {
                setCourse(v);
                setPage(1);
              }}
              options={courseOptions}
            />
          </Col>

          <Col xs={12} sm={6} md={4}>
            <Select
              allowClear
              placeholder="Trạng thái học vụ"
              style={{ width: '100%' }}
              value={target}
              onChange={(v) => {
                setTarget(v);
                setPage(1);
              }}
              options={[
                { value: 'Dropout', label: '🔴 Thôi học (Dropout)' },
                { value: 'Enrolled', label: '🔵 Đang học (Enrolled)' },
                { value: 'Graduate', label: '🟢 Tốt nghiệp (Graduate)' },
              ]}
            />
          </Col>

          <Col xs={12} sm={6} md={4}>
            <Select
              allowClear
              placeholder="Tình trạng học phí"
              style={{ width: '100%' }}
              value={tuition}
              onChange={(v) => {
                setTuition(v);
                setPage(1);
              }}
              options={[
                { value: 1, label: 'Đóng đúng hạn' },
                { value: 0, label: 'Chưa đóng / Trễ hạn' },
              ]}
            />
          </Col>

          <Col xs={12} sm={6} md={3}>
            <Select
              allowClear
              placeholder="Công nợ"
              style={{ width: '100%' }}
              value={debtor}
              onChange={(v) => {
                setDebtor(v);
                setPage(1);
              }}
              options={[
                { value: 1, label: 'Đang nợ' },
                { value: 0, label: 'Không nợ' },
              ]}
            />
          </Col>

          <Col xs={12} sm={6} md={4}>
            <Select
              allowClear
              placeholder="Học bổng"
              style={{ width: '100%' }}
              value={scholarship}
              onChange={(v) => {
                setScholarship(v);
                setPage(1);
              }}
              options={[
                { value: 1, label: 'Có học bổng' },
                { value: 0, label: 'Không học bổng' },
              ]}
            />
          </Col>

          <Col xs={12} sm={6} md={4}>
            <Select
              allowClear
              placeholder="Mức rủi ro đã đánh giá"
              style={{ width: '100%' }}
              value={riskLevel}
              onChange={(v) => {
                setRiskLevel(v);
                setPage(1);
              }}
              options={[
                { value: 'High', label: 'Nguy cơ Cao' },
                { value: 'Medium', label: 'Nguy cơ Vừa' },
                { value: 'Low', label: 'Nguy cơ Thấp' },
              ]}
            />
          </Col>

          <Col xs={12} sm={8} md={6}>
            <Space.Compact style={{ width: '100%' }}>
              <Select
                value={sortBy}
                onChange={setSortBy}
                style={{ width: '68%' }}
                options={[
                  { value: 'student_code', label: 'Sắp xếp: Mã SV' },
                  { value: 'admission_grade', label: 'Sắp xếp: Điểm đầu vào' },
                  { value: 'curricular_units_1st_sem_grade', label: 'Sắp xếp: Điểm TB HK1' },
                  { value: 'curricular_units_2nd_sem_grade', label: 'Sắp xếp: Điểm TB HK2' },
                  { value: 'age_at_enrollment', label: 'Sắp xếp: Tuổi nhập học' },
                ]}
              />
              <Select
                value={order}
                onChange={setOrder}
                style={{ width: '32%' }}
                options={[
                  { value: 'asc', label: 'Tăng ↑' },
                  { value: 'desc', label: 'Giảm ↓' },
                ]}
              />
            </Space.Compact>
          </Col>

          <Col xs={24} sm={8} md={10} style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Space>
              <Tag icon={<FilterOutlined />} color="blue" style={{ padding: '4px 10px' }}>
                Tổng kết quả: <strong>{data?.total?.toLocaleString() ?? 0}</strong> sinh viên
              </Tag>
              <Button icon={<ReloadOutlined />} onClick={handleResetFilters}>
                Đặt lại bộ lọc
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Main Directory Table */}
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table
          rowKey="student_code"
          loading={loading}
          dataSource={data?.items || []}
          scroll={{ x: 1150 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.total || 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => `${range[0]}–${range[1]} trên ${total.toLocaleString()} SV`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          columns={[
            {
              title: 'Mã SV',
              dataIndex: 'student_code',
              width: 105,
              fixed: 'left',
              render: (code: string) => (
                <Button
                  type="link"
                  style={{ padding: 0, fontWeight: 700 }}
                  onClick={() => navigate(`/students/${code}`)}
                >
                  {code}
                </Button>
              ),
            },
            {
              title: 'Ngành đào tạo',
              dataIndex: 'course_name',
              width: 220,
              render: (name: string, r: StudentListItem) => (
                <div>
                  <div style={{ fontWeight: 500, color: '#0f172a' }}>
                    {name || `Ngành #${r.course}`}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    Mã ngành: {r.course} · {r.daytime_evening_attendance === 1 ? 'Ban ngày' : 'Buổi tối'}
                  </div>
                </div>
              ),
            },
            {
              title: 'Cá nhân',
              key: 'personal',
              width: 115,
              render: (_: any, r: StudentListItem) => (
                <div>
                  <Tag style={{ margin: 0 }} color={r.gender === 1 ? 'geekblue' : 'magenta'}>
                    {r.gender === 1 ? 'Nam' : 'Nữ'}
                  </Tag>
                  <span style={{ marginLeft: 6, fontSize: 12, color: '#475569' }}>
                    {r.age_at_enrollment} tuổi
                  </span>
                </div>
              ),
            },
            {
              title: 'Đầu vào',
              dataIndex: 'admission_grade',
              width: 95,
              align: 'right',
              render: (v: number) => <Text>{v.toFixed(1)}</Text>,
            },
            {
              title: 'Học kỳ 1 (Điểm / Đạt)',
              key: 'sem1',
              width: 145,
              align: 'right',
              render: (_: any, r: StudentListItem) => (
                <div>
                  <Text
                    strong
                    style={{
                      color: r.curricular_units_1st_sem_grade < 10 ? '#dc2626' : '#0f172a',
                    }}
                  >
                    {r.curricular_units_1st_sem_grade.toFixed(2)}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {' '}
                    ({r.curricular_units_1st_sem_approved} môn)
                  </Text>
                </div>
              ),
            },
            {
              title: 'Học kỳ 2 (Điểm / Đạt)',
              key: 'sem2',
              width: 145,
              align: 'right',
              render: (_: any, r: StudentListItem) => (
                <div>
                  <Text
                    strong
                    style={{
                      color: r.curricular_units_2nd_sem_grade < 10 ? '#dc2626' : '#0f172a',
                    }}
                  >
                    {r.curricular_units_2nd_sem_grade.toFixed(2)}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {' '}
                    ({r.curricular_units_2nd_sem_approved} môn)
                  </Text>
                </div>
              ),
            },
            {
              title: 'Tài chính & Học bổng',
              key: 'finance',
              width: 185,
              render: (_: any, r: StudentListItem) => (
                <Space size={4} wrap>
                  {r.tuition_fees_up_to_date === 1 ? (
                    <Tag color="default">Đủ học phí</Tag>
                  ) : (
                    <Tag color="error">Trễ học phí</Tag>
                  )}
                  {r.debtor === 1 && <Tag color="warning">Đang nợ</Tag>}
                  {r.scholarship_holder === 1 && <Tag color="success">Học bổng</Tag>}
                </Space>
              ),
            },
            {
              title: 'Trạng thái học vụ',
              dataIndex: 'target',
              width: 130,
              render: (t: string) => renderTargetTag(t),
            },
            {
              title: 'Đánh giá gần nhất',
              key: 'risk',
              width: 165,
              render: (_: any, r: StudentListItem) =>
                renderRiskTag(r.latest_risk_level, r.latest_risk_score),
            },
            {
              title: 'Thao tác',
              key: 'actions',
              fixed: 'right',
              width: 185,
              align: 'right',
              render: (_: any, r: StudentListItem) => (
                <Space>
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/students/${r.student_code}`)}
                  >
                    Hồ sơ
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    icon={<AlertOutlined />}
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

      {/* Admin Create Student Modal */}
      <Modal
        title="Thêm Hồ sơ Sinh viên Mới (Quản trị viên)"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        width={960}
        footer={null}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateStudent}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="student_code"
                label="Mã sinh viên (Để trống hệ thống sẽ tự sinh mã SVxxxx tiếp theo)"
              >
                <Input placeholder="Ví dụ: SV4425 (hoặc để trống)" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="target" label="Trạng thái học vụ hiện tại">
                <Select
                  allowClear
                  options={[
                    { value: 'Enrolled', label: 'Đang theo học (Enrolled)' },
                    { value: 'Graduate', label: 'Tốt nghiệp (Graduate)' },
                    { value: 'Dropout', label: 'Thôi học (Dropout)' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Collapse
            defaultActiveKey={['personal', 'admission', 'financial']}
            items={Object.entries(groupedFields).map(([grp, fields]) => ({
              key: grp,
              label: <strong>{GROUP_LABELS[grp] || grp}</strong>,
              children: <MetaFormItems fields={fields} colSpan={8} />,
            }))}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={creating}>
              Lưu hồ sơ sinh viên
            </Button>
          </div>
        </Form>
      </Modal>
    </Space>
  );
};

