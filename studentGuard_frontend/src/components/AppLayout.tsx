import React, { useState } from 'react';
import {
  AutoComplete,
  Avatar,
  Badge,
  Button,
  Dropdown,
  Form,
  Input,
  Layout,
  Menu,
  Modal,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  AlertOutlined,
  BankOutlined,
  DashboardOutlined,
  HistoryOutlined,
  KeyOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
  SolutionOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { StudentListItem, StudentPage } from '../types';
import { renderTargetTag } from '../utils/ui';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Global quick search (Workday Student style)
  const [searchOptions, setSearchOptions] = useState<{ value: string; label: React.ReactNode }[]>([]);
  const [searchValue, setSearchValue] = useState('');

  // Change password modal
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdForm] = Form.useForm();

  const handleGlobalSearch = async (val: string) => {
    setSearchValue(val);
    if (!val || val.trim().length < 2) {
      setSearchOptions([]);
      return;
    }
    try {
      const res = await api.get<StudentPage>('/api/search/students', {
        params: { q: val.trim(), page_size: 6 },
      });
      const opts = res.data.items.map((item: StudentListItem) => ({
        value: item.student_code,
        label: (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong>{item.student_code}</Text>
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                {item.course_name || `Course #${item.course}`} · Age {item.age_at_enrollment}
              </Text>
            </div>
            {renderTargetTag(item.target)}
          </div>
        ),
      }));
      setSearchOptions(opts);
    } catch {
      setSearchOptions([]);
    }
  };

  const handleSelectStudent = (code: string) => {
    setSearchValue('');
    setSearchOptions([]);
    navigate(`/students/${code}`);
  };

  const handleChangePassword = async (values: { old_password: string; new_password: string }) => {
    setPwdLoading(true);
    try {
      await api.post('/api/auth/change-password', values);
      message.success('Password updated successfully!');
      setPwdModalOpen(false);
      pwdForm.resetFields();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setPwdLoading(false);
    }
  };

  const selectedKey = (() => {
    const p = location.pathname;
    if (p.startsWith('/students')) return '/students';
    if (p.startsWith('/predict') && !p.startsWith('/predictions')) return '/predict';
    if (p.startsWith('/predictions')) return '/predictions';
    if (p.startsWith('/users')) return '/users';
    return '/';
  })();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Academic Overview',
    },
    {
      key: '/students',
      icon: <SolutionOutlined />,
      label: 'Student Directory',
    },
    {
      key: '/predict',
      icon: <AlertOutlined />,
      label: 'Risk Assessment',
    },
    {
      key: '/predictions',
      icon: <HistoryOutlined />,
      label: 'Prediction Logs',
    },
    ...(user?.role === 'Admin'
      ? [
          {
            key: '/users',
            icon: <TeamOutlined />,
            label: 'User Management',
          },
        ]
      : []),
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={250}
        style={{
          background: '#0f172a',
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
          position: 'sticky',
          top: 0,
          height: '100vh',
          left: 0,
          zIndex: 20,
        }}
      >
        <div
          onClick={() => navigate('/')}
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            gap: 12,
            cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 20,
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(37,99,235,0.4)',
            }}
          >
            <BankOutlined />
          </div>
          {!collapsed && (
            <div style={{ lineHeight: 1.25 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: -0.3 }}>
                StudentGuard
              </div>
              <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 500 }}>
                ACADEMIC SIS PORTAL
              </div>
            </div>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={({ key }) => navigate(key)}
          items={menuItems}
          style={{
            background: 'transparent',
            borderRight: 0,
            padding: '12px 8px',
            fontSize: 14,
          }}
        />

        {!collapsed && (
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              right: 16,
              padding: '12px 14px',
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}>
              Fall Semester · 2026–2027
            </div>
            <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
              UCI Dataset #697 · 4,424 Students
            </div>
          </div>
        )}
      </Sider>

      <Layout style={{ background: '#f1f5f9' }}>
        <Header
          style={{
            background: '#ffffff',
            padding: '0 24px',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e2e8f0',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Space size={16} style={{ flex: 1 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16 }}
            />
            <AutoComplete
              value={searchValue}
              options={searchOptions}
              onSearch={handleGlobalSearch}
              onSelect={handleSelectStudent}
              style={{ width: 380, maxWidth: '100%' }}
            >
              <Input
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                placeholder="Quick search by Student ID (e.g., SV0001) or Program..."
                allowClear
                onPressEnter={() => {
                  if (searchValue.trim()) {
                    navigate(`/students?q=${encodeURIComponent(searchValue.trim())}`);
                    setSearchOptions([]);
                  }
                }}
              />
            </AutoComplete>
          </Space>

          <Space size={16}>
            <Badge
              status="processing"
              text={<Text type="secondary" style={{ fontSize: 13 }}>System Online</Text>}
            />
            <Tag color={user?.role === 'Admin' ? 'blue' : 'cyan'} style={{ margin: 0, fontWeight: 600 }}>
              {user?.role === 'Admin' ? 'Administrator' : 'Academic Advisor'}
            </Tag>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'pwd',
                    icon: <KeyOutlined />,
                    label: 'Change Password',
                    onClick: () => setPwdModalOpen(true),
                  },
                  { type: 'divider' },
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    danger: true,
                    label: 'Sign Out',
                    onClick: () => {
                      logout();
                      navigate('/login');
                    },
                  },
                ],
              }}
              trigger={['click']}
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar
                  style={{
                    backgroundColor: user?.role === 'Admin' ? '#2563eb' : '#0891b2',
                  }}
                  icon={<UserOutlined />}
                />
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
                    {user?.full_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>@{user?.username}</div>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ padding: '24px', maxWidth: 1600, width: '100%', margin: '0 auto' }}>
          <Outlet />
        </Content>
      </Layout>

      <Modal
        title="Change Account Password"
        open={pwdModalOpen}
        onCancel={() => setPwdModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={pwdForm} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item
            name="old_password"
            label="Current Password"
            rules={[{ required: true, message: 'Please enter your current password' }]}
          >
            <Input.Password placeholder="Enter current password" />
          </Form.Item>
          <Form.Item
            name="new_password"
            label="New Password (minimum 6 characters)"
            rules={[
              { required: true, message: 'Please enter a new password' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
          >
            <Input.Password placeholder="Enter new password" />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setPwdModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={pwdLoading}>
              Update Password
            </Button>
          </div>
        </Form>
      </Modal>
    </Layout>
  );
};
