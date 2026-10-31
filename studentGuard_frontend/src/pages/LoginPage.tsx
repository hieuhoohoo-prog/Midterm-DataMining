import React, { useState } from 'react';
import { Alert, Button, Card, Divider, Form, Input, Space, Tag, Typography } from 'antd';
import {
  BankOutlined,
  CheckCircleOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Title, Text, Paragraph } = Typography;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      await login(values.username, values.password);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Sai tên đăng nhập hoặc mật khẩu. Vui lòng kiểm tra lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAccount = (username: string, password: string) => {
    form.setFieldsValue({ username, password });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        background: '#0f172a',
      }}
    >
      {/* Left Column: University Branding & Portal Announcements */}
      <div
        style={{
          padding: '56px 64px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background:
            'radial-gradient(circle at 20% 20%, rgba(37, 99, 235, 0.28), transparent 55%), linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
          color: '#fff',
        }}
      >
        <div>
          <Space size={14} align="center">
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                color: '#fff',
                boxShadow: '0 8px 20px rgba(37,99,235,0.45)',
              }}
            >
              <BankOutlined />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
                StudentGuard SIS
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', letterSpacing: 0.6 }}>
                CỔNG THÔNG TIN ĐÀO TẠO & CẢNH BÁO HỌC VỤ SỚM
              </div>
            </div>
          </Space>

          <div style={{ marginTop: 48, maxWidth: 520 }}>
            <Tag color="blue" style={{ marginBottom: 16, fontWeight: 600 }}>
              PHÒNG ĐÀO TẠO & CÔNG TÁC SINH VIÊN
            </Tag>
            <Title level={1} style={{ color: '#fff', marginTop: 0, lineHeight: 1.25 }}>
              Phát hiện sớm rủi ro học tập – Đồng hành kịp thời cùng sinh viên
            </Title>
            <Paragraph style={{ color: '#cbd5e1', fontSize: 15, lineHeight: 1.7 }}>
              Hệ thống tích hợp hồ sơ học vụ của <strong>4.424 sinh viên</strong> thuộc 17 ngành
              đào tạo, hỗ trợ Cố vấn học tập và Ban Quản trị theo dõi tiến độ tín chỉ, tình trạng
              học phí và dự báo nguy cơ thôi học theo 3 mốc: <em>Nhập học</em>,{' '}
              <em>Học kỳ 1</em> và <em>Học kỳ 2</em>.
            </Paragraph>
          </div>

          <div
            style={{
              marginTop: 32,
              padding: 20,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              maxWidth: 520,
            }}
          >
            <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 10 }}>
              📌 Thông báo học vụ mới nhất
            </div>
            <Space direction="vertical" size={8} style={{ color: '#cbd5e1', fontSize: 13 }}>
              <div>
                <CheckCircleOutlined style={{ color: '#38bdf8', marginRight: 8 }} />
                Đã đồng bộ dữ liệu điểm tổng kết Học kỳ 1 & Học kỳ 2 từ bộ dữ liệu chuẩn UCI #697.
              </div>
              <div>
                <CheckCircleOutlined style={{ color: '#38bdf8', marginRight: 8 }} />
                Mở cổng rà soát danh sách sinh viên nợ học phí và cảnh báo học vụ sớm.
              </div>
              <div>
                <CheckCircleOutlined style={{ color: '#38bdf8', marginRight: 8 }} />
                Hỗ trợ giải thích yếu tố rủi ro (Explainable AI) và gợi ý hướng tư vấn cho cố vấn.
              </div>
            </Space>
          </div>
        </div>

        <div style={{ color: '#64748b', fontSize: 12, marginTop: 32 }}>
          © 2026 StudentGuard – Đồ án Giữa kỳ môn Khai phá dữ liệu (Data Mining)
        </div>
      </div>

      {/* Right Column: Login Card */}
      <div
        style={{
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <Card
          style={{
            width: '100%',
            maxWidth: 440,
            borderRadius: 16,
            boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)',
            border: '1px solid #e2e8f0',
          }}
          styles={{ body: { padding: 36 } }}
        >
          <div style={{ marginBottom: 24 }}>
            <Title level={3} style={{ marginBottom: 4, color: '#0f172a' }}>
              Đăng nhập Hệ thống
            </Title>
            <Text type="secondary">
              Sử dụng tài khoản Cố vấn học tập hoặc Quản trị viên được nhà trường cấp
            </Text>
          </div>

          {error && (
            <Alert
              type="error"
              showIcon
              message={error}
              style={{ marginBottom: 20, borderRadius: 8 }}
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{ username: 'advisor', password: 'advisor123' }}
            size="large"
          >
            <Form.Item
              name="username"
              label="Tên đăng nhập"
              rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Ví dụ: advisor hoặc admin" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu" />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{ height: 44, fontWeight: 600, marginTop: 8 }}
            >
              Đăng nhập Cổng Đào tạo
            </Button>
          </Form>

          <Divider style={{ margin: '24px 0 16px' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Tài khoản mẫu để kiểm thử nhanh
            </Text>
          </Divider>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Button
              icon={<SafetyCertificateOutlined />}
              onClick={() => fillQuickAccount('advisor', 'advisor123')}
              style={{ fontSize: 12 }}
            >
              Cố vấn (advisor)
            </Button>
            <Button
              icon={<UserOutlined />}
              onClick={() => fillQuickAccount('admin', 'admin123')}
              style={{ fontSize: 12 }}
            >
              Quản trị (admin)
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

