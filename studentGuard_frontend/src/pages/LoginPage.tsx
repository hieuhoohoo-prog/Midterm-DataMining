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
          'Incorrect username or password. Please try again.'
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
                STUDENT INFORMATION & EARLY WARNING SYSTEM
              </div>
            </div>
          </Space>

          <div style={{ marginTop: 48, maxWidth: 520 }}>
            <Tag color="blue" style={{ marginBottom: 16, fontWeight: 600 }}>
              OFFICE OF ACADEMIC AFFAIRS & STUDENT SUCCESS
            </Tag>
            <Title level={1} style={{ color: '#fff', marginTop: 0, lineHeight: 1.25 }}>
              Early Dropout Risk Detection & Proactive Student Advising
            </Title>
            <Paragraph style={{ color: '#cbd5e1', fontSize: 15, lineHeight: 1.7 }}>
              Integrated academic records for <strong>4,424 students</strong> across 17
              undergraduate programs, empowering Academic Advisors and Administrators to monitor
              credit progression, tuition compliance, and predict dropout risk across three
              leakage-free stages: <em>Enrollment</em>, <em>Semester 1</em>, and{' '}
              <em>Semester 2</em>.
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
              Academic Portal Bulletins
            </div>
            <Space direction="vertical" size={8} style={{ color: '#cbd5e1', fontSize: 13 }}>
              <div>
                <CheckCircleOutlined style={{ color: '#38bdf8', marginRight: 8 }} />
                Synchronized Semester 1 & Semester 2 academic records from UCI Dataset #697.
              </div>
              <div>
                <CheckCircleOutlined style={{ color: '#38bdf8', marginRight: 8 }} />
                Active early-warning screening for students with overdue tuition and low GPA.
              </div>
              <div>
                <CheckCircleOutlined style={{ color: '#38bdf8', marginRight: 8 }} />
                Explainable risk factor breakdown and actionable intervention guidance for advisors.
              </div>
            </Space>
          </div>
        </div>

        <div style={{ color: '#64748b', fontSize: 12, marginTop: 32 }}>
          © 2026 StudentGuard – Data Mining Midterm Project
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
              Sign In to Portal
            </Title>
            <Text type="secondary">
              Use your Academic Advisor or Administrator credentials
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
              label="Username"
              rules={[{ required: true, message: 'Please enter your username' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="e.g., advisor or admin" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Enter password" />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{ height: 44, fontWeight: 600, marginTop: 8 }}
            >
              Sign In
            </Button>
          </Form>

          <Divider style={{ margin: '24px 0 16px' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Quick Demo Accounts
            </Text>
          </Divider>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Button
              icon={<SafetyCertificateOutlined />}
              onClick={() => fillQuickAccount('advisor', 'advisor123')}
              style={{ fontSize: 12 }}
            >
              Advisor (advisor)
            </Button>
            <Button
              icon={<UserOutlined />}
              onClick={() => fillQuickAccount('admin', 'admin123')}
              style={{ fontSize: 12 }}
            >
              Admin (admin)
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
