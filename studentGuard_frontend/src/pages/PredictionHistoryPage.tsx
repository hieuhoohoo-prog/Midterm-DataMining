import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { PredictionOut, PredictionPage } from '../types';
import { renderRiskTag, renderTargetTag, STAGE_LABELS } from '../utils/ui';

const { Title, Text } = Typography;

export const PredictionHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<PredictionPage | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const [studentCode, setStudentCode] = useState<string>('');
  const [stage, setStage] = useState<string | undefined>(undefined);
  const [riskLevel, setRiskLevel] = useState<string | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get<PredictionPage>('/api/predictions', {
        params: {
          student_code: studentCode.trim() || undefined,
          stage,
          risk_level: riskLevel,
          page,
          page_size: pageSize,
        },
      });
      setData(res.data);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Không thể tải lịch sử đánh giá');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [studentCode, stage, riskLevel, page, pageSize]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
          Nhật ký Đánh giá Nguy cơ Học vụ
        </Title>
        <Text type="secondary">
          Lưu vết toàn bộ các lần dự đoán rủi ro sinh viên của Cố vấn học tập và Quản trị viên.
        </Text>
      </div>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Input
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Lọc theo mã SV (VD: SV0001)..."
              value={studentCode}
              onChange={(e) => {
                setStudentCode(e.target.value);
                setPage(1);
              }}
              allowClear
            />
          </Col>

          <Col xs={12} sm={8} md={5}>
            <Select
              allowClear
              placeholder="Giai đoạn dự báo"
              style={{ width: '100%' }}
              value={stage}
              onChange={(v) => {
                setStage(v);
                setPage(1);
              }}
              options={[
                { value: 'enrollment', label: 'Khi nhập học' },
                { value: 'semester_1', label: 'Sau Học kỳ 1' },
                { value: 'semester_2', label: 'Sau Học kỳ 2' },
              ]}
            />
          </Col>

          <Col xs={12} sm={8} md={5}>
            <Select
              allowClear
              placeholder="Mức độ rủi ro"
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

          <Col xs={24} md={8} style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Space>
              <Tag color="blue" style={{ padding: '4px 10px' }}>
                Tổng số: <strong>{data?.total ?? 0}</strong> lượt đánh giá
              </Tag>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setStudentCode('');
                  setStage(undefined);
                  setRiskLevel(undefined);
                  setPage(1);
                }}
              >
                Đặt lại
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data?.items || []}
          pagination={{
            current: page,
            pageSize,
            total: data?.total || 0,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          columns={[
            {
              title: 'ID',
              dataIndex: 'id',
              width: 80,
              render: (id: number) => `#${id}`,
            },
            {
              title: 'Mã sinh viên',
              dataIndex: 'student_code',
              width: 130,
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
              title: 'Giai đoạn đánh giá',
              dataIndex: 'stage',
              width: 160,
              render: (st: string) => <Tag color="blue">{STAGE_LABELS[st] || st}</Tag>,
            },
            {
              title: 'Điểm rủi ro',
              dataIndex: 'risk_score',
              width: 130,
              render: (sc: number) => <strong>{Math.round(sc * 100)}% ({sc.toFixed(2)})</strong>,
            },
            {
              title: 'Mức độ rủi ro',
              dataIndex: 'risk_level',
              width: 180,
              render: (lv: string, r: PredictionOut) => renderRiskTag(lv, r.risk_score),
            },
            {
              title: 'Xu hướng dự báo',
              dataIndex: 'predicted_label',
              width: 150,
              render: (lb: string) => renderTargetTag(lb),
            },
            {
              title: 'Cán bộ thực hiện',
              dataIndex: 'evaluator_name',
              render: (name: string, r: PredictionOut) => name || `User #${r.evaluated_by}`,
            },
            {
              title: 'Thời gian',
              dataIndex: 'created_at',
              width: 180,
              render: (dt: string) => new Date(dt).toLocaleString('vi-VN'),
            },
            {
              title: 'Hồ sơ',
              key: 'act',
              width: 110,
              align: 'right',
              render: (_: any, r: PredictionOut) => (
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => navigate(`/students/${r.student_code}`)}
                >
                  Xem SV
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
};

