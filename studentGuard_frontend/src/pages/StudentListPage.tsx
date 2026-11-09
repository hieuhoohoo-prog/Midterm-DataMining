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
      message.error(err.response?.data?.detail || 'Failed to load student directory');
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
      const allValues = { ...createForm.getFieldsValue(true), ...values };
      if (!allValues.student_code || !allValues.student_code.trim()) {
        delete allValues.student_code;
      }
      const res = await api.post('/api/students', allValues);
      message.success(`Created student record ${res.data.student_code}`);
      setCreateOpen(false);
      navigate(`/students/${res.data.student_code}`);
    } catch (err: any) {
      message.error(
        typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : 'Failed to create student record'
      );
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
            Student Directory
          </Title>
          <Text type="secondary">
            Search and filter student records by program, tuition compliance, academic grades, and
            evaluated dropout risk.
          </Text>
        </div>
        {user?.role === 'Admin' && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Add Student Record
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={7}>
            <Input
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Search by Student ID (SV0001...) or Program..."
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
              placeholder="Course / Program (17 programs)"
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
              placeholder="Academic Outcome"
              style={{ width: '100%' }}
              value={target}
              onChange={(v) => {
                setTarget(v);
                setPage(1);
              }}
              options={[
                { value: 'Dropout', label: 'Dropout' },
                { value: 'Enrolled', label: 'Enrolled' },
                { value: 'Graduate', label: 'Graduate' },
              ]}
            />
          </Col>

          <Col xs={12} sm={6} md={4}>
            <Select
              allowClear
              placeholder="Tuition Status"
              style={{ width: '100%' }}
              value={tuition}
              onChange={(v) => {
                setTuition(v);
                setPage(1);
              }}
              options={[
                { value: 1, label: 'Up to date' },
                { value: 0, label: 'Overdue' },
              ]}
            />
          </Col>

          <Col xs={12} sm={6} md={3}>
            <Select
              allowClear
              placeholder="Debtor"
              style={{ width: '100%' }}
              value={debtor}
              onChange={(v) => {
                setDebtor(v);
                setPage(1);
              }}
              options={[
                { value: 1, label: 'Debtor' },
                { value: 0, label: 'No Debt' },
              ]}
            />
          </Col>

          <Col xs={12} sm={6} md={4}>
            <Select
              allowClear
              placeholder="Scholarship"
              style={{ width: '100%' }}
              value={scholarship}
              onChange={(v) => {
                setScholarship(v);
                setPage(1);
              }}
              options={[
                { value: 1, label: 'Scholarship Holder' },
                { value: 0, label: 'No Scholarship' },
              ]}
            />
          </Col>

          <Col xs={12} sm={6} md={4}>
            <Select
              allowClear
              placeholder="Evaluated Risk Level"
              style={{ width: '100%' }}
              value={riskLevel}
              onChange={(v) => {
                setRiskLevel(v);
                setPage(1);
              }}
              options={[
                { value: 'High', label: 'High Risk' },
                { value: 'Medium', label: 'Medium Risk' },
                { value: 'Low', label: 'Low Risk' },
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
                  { value: 'student_code', label: 'Sort: Student ID' },
                  { value: 'admission_grade', label: 'Sort: Admission Grade' },
                  { value: 'curricular_units_1st_sem_grade', label: 'Sort: Sem 1 Grade' },
                  { value: 'curricular_units_2nd_sem_grade', label: 'Sort: Sem 2 Grade' },
                  { value: 'age_at_enrollment', label: 'Sort: Age' },
                ]}
              />
              <Select
                value={order}
                onChange={setOrder}
                style={{ width: '32%' }}
                options={[
                  { value: 'asc', label: 'Asc ↑' },
                  { value: 'desc', label: 'Desc ↓' },
                ]}
              />
            </Space.Compact>
          </Col>

          <Col xs={24} sm={8} md={10} style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Space>
              <Tag icon={<FilterOutlined />} color="blue" style={{ padding: '4px 10px' }}>
                Matching Records: <strong>{data?.total?.toLocaleString() ?? 0}</strong> students
              </Tag>
              <Button icon={<ReloadOutlined />} onClick={handleResetFilters}>
                Reset Filters
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Main Directory Table */}
      <Card
        bordered={false}
        style={{ borderRadius: 12, overflow: 'hidden' }}
        styles={{ body: { padding: '16px 20px' } }}
      >
        <Table
          className="sg-directory-table"
          rowKey="student_code"
          loading={loading}
          dataSource={data?.items || []}
          scroll={{ x: 1380 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.total || 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => `${range[0]}–${range[1]} of ${total.toLocaleString()} students`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          columns={[
            {
              title: 'Student ID',
              dataIndex: 'student_code',
              width: 115,
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
              title: 'Course / Program',
              dataIndex: 'course_name',
              width: 240,
              render: (name: string, r: StudentListItem) => (
                <div>
                  <div style={{ fontWeight: 500, color: '#0f172a' }}>
                    {name || `Course #${r.course}`}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    Code: {r.course} · {r.daytime_evening_attendance === 1 ? 'Daytime' : 'Evening'}
                  </div>
                </div>
              ),
            },
            {
              title: 'Demographics',
              key: 'personal',
              width: 135,
              render: (_: any, r: StudentListItem) => (
                <div>
                  <Tag style={{ margin: 0 }} color={r.gender === 1 ? 'geekblue' : 'magenta'}>
                    {r.gender === 1 ? 'Male' : 'Female'}
                  </Tag>
                  <span style={{ marginLeft: 6, fontSize: 12, color: '#475569' }}>
                    Age {r.age_at_enrollment}
                  </span>
                </div>
              ),
            },
            {
              title: 'Admission',
              dataIndex: 'admission_grade',
              width: 105,
              align: 'right',
              render: (v: number) => <Text>{v.toFixed(1)}</Text>,
            },
            {
              title: 'Sem 1 (GPA / Passed)',
              key: 'sem1',
              width: 165,
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
                    ({r.curricular_units_1st_sem_approved} units)
                  </Text>
                </div>
              ),
            },
            {
              title: 'Sem 2 (GPA / Passed)',
              key: 'sem2',
              width: 165,
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
                    ({r.curricular_units_2nd_sem_approved} units)
                  </Text>
                </div>
              ),
            },
            {
              title: 'Financial Status',
              key: 'finance',
              width: 210,
              render: (_: any, r: StudentListItem) => (
                <Space size={4} wrap>
                  {r.tuition_fees_up_to_date === 1 ? (
                    <Tag color="default" style={{ margin: 0 }}>Tuition Paid</Tag>
                  ) : (
                    <Tag color="error" style={{ margin: 0 }}>Tuition Overdue</Tag>
                  )}
                  {r.debtor === 1 && <Tag color="warning" style={{ margin: 0 }}>Debtor</Tag>}
                  {r.scholarship_holder === 1 && <Tag color="success" style={{ margin: 0 }}>Scholarship</Tag>}
                </Space>
              ),
            },
            {
              title: 'Outcome',
              dataIndex: 'target',
              width: 130,
              render: (t: string) => renderTargetTag(t),
            },
            {
              title: 'Latest Risk',
              key: 'risk',
              width: 170,
              render: (_: any, r: StudentListItem) =>
                renderRiskTag(r.latest_risk_level, r.latest_risk_score),
            },
            {
              title: 'Actions',
              key: 'actions',
              fixed: 'right',
              width: 215,
              align: 'center',
              render: (_: any, r: StudentListItem) => (
                <Space size={8}>
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/students/${r.student_code}`)}
                  >
                    Profile
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    icon={<AlertOutlined />}
                    onClick={() => navigate(`/predict?student=${r.student_code}`)}
                  >
                    Evaluate
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* Admin Create Student Modal */}
      <Modal
        title="Add New Student Record (Administrator)"
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
                label="Student ID (Leave blank to auto-generate next SVxxxx code)"
              >
                <Input placeholder="e.g., SV4425 (or leave blank)" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="target" label="Current Academic Outcome">
                <Select
                  allowClear
                  options={[
                    { value: 'Enrolled', label: 'Enrolled' },
                    { value: 'Graduate', label: 'Graduate' },
                    { value: 'Dropout', label: 'Dropout' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Collapse
            defaultActiveKey={['personal', 'admission', 'financial']}
            items={Object.entries(groupedFields).map(([grp, fields]) => ({
              key: grp,
              forceRender: true,
              label: <strong>{GROUP_LABELS[grp] || grp}</strong>,
              children: <MetaFormItems fields={fields} colSpan={8} />,
            }))}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={creating}>
              Save Student Record
            </Button>
          </div>
        </Form>
      </Modal>
    </Space>
  );
};
