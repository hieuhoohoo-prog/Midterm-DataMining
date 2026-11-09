import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { UserOut } from '../types';

const { Title, Text } = Typography;

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserOut[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserOut | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get<UserOut[]>('/api/users');
      setUsers(res.data);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to load user accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (currentUser?.role !== 'Admin') {
    return (
      <Alert
        type="error"
        showIcon
        message="Access Denied"
        description="User management is restricted to System Administrators (Admin)."
      />
    );
  }

  const handleCreate = async (values: any) => {
    setSubmitting(true);
    try {
      await api.post('/api/users', values);
      message.success('User account created successfully!');
      setCreateOpen(false);
      createForm.resetFields();
      fetchUsers();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to create user account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (values: any) => {
    if (!editUser) return;
    setSubmitting(true);
    try {
      const payload: any = {
        full_name: values.full_name,
        role: values.role,
      };
      if (values.password && values.password.trim()) {
        payload.password = values.password.trim();
      }
      await api.put(`/api/users/${editUser.id}`, payload);
      message.success('User account updated!');
      setEditUser(null);
      fetchUsers();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to update user account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (u: UserOut) => {
    try {
      await api.delete(`/api/users/${u.id}`);
      message.success(`Deleted user @${u.username}`);
      fetchUsers();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to delete user account');
    }
  };

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
            User Management & Role-Based Access Control (RBAC)
          </Title>
          <Text type="secondary">
            Provision and manage accounts for Academic Advisors and System Administrators.
          </Text>
        </div>

        <Button
          type="primary"
          icon={<UserAddOutlined />}
          onClick={() => {
            createForm.resetFields();
            setCreateOpen(true);
          }}
        >
          Create New User
        </Button>
      </div>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={users}
          pagination={false}
          columns={[
            {
              title: 'ID',
              dataIndex: 'id',
              width: 80,
              render: (id: number) => `#${id}`,
            },
            {
              title: 'Username',
              dataIndex: 'username',
              render: (u: string) => <Text strong>@{u}</Text>,
            },
            {
              title: 'Full Name',
              dataIndex: 'full_name',
            },
            {
              title: 'System Role',
              dataIndex: 'role',
              render: (role: string) => (
                <Tag color={role === 'Admin' ? 'blue' : 'cyan'} style={{ fontWeight: 600 }}>
                  {role === 'Admin' ? 'Administrator (Admin)' : 'Academic Advisor'}
                </Tag>
              ),
            },
            {
              title: 'Actions',
              key: 'actions',
              width: 220,
              align: 'right',
              render: (_: any, u: UserOut) => (
                <Space>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditUser(u);
                      editForm.setFieldsValue({
                        full_name: u.full_name,
                        role: u.role,
                        password: '',
                      });
                    }}
                  >
                    Edit
                  </Button>
                  <Popconfirm
                    title={`Are you sure you want to delete @${u.username}?`}
                    onConfirm={() => handleDelete(u)}
                    okText="Delete"
                    cancelText="Cancel"
                    disabled={u.id === currentUser?.id}
                  >
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={u.id === currentUser?.id}
                    >
                      Delete
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* Create User Modal */}
      <Modal
        title="Create New Staff Account"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ role: 'Academic Advisor' }}
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please enter a username' }]}
          >
            <Input placeholder="e.g., advisor02" />
          </Form.Item>
          <Form.Item
            name="full_name"
            label="Full Name"
            rules={[{ required: true, message: 'Please enter full name' }]}
          >
            <Input placeholder="e.g., Dr. Jane Doe" />
          </Form.Item>
          <Form.Item
            name="role"
            label="System Role"
            rules={[{ required: true, message: 'Please select a role' }]}
          >
            <Select
              options={[
                { value: 'Academic Advisor', label: 'Academic Advisor' },
                { value: 'Admin', label: 'System Administrator (Admin)' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="password"
            label="Initial Password"
            rules={[
              { required: true, message: 'Please enter a password' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
          >
            <Input.Password placeholder="Enter initial password" />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={submitting}>
              Create Account
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        title={`Edit Account @${editUser?.username}`}
        open={!!editUser}
        onCancel={() => setEditUser(null)}
        footer={null}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item
            name="full_name"
            label="Full Name"
            rules={[{ required: true, message: 'Please enter full name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="role"
            label="System Role"
            rules={[{ required: true, message: 'Please select a role' }]}
          >
            <Select
              disabled={editUser?.id === currentUser?.id}
              options={[
                { value: 'Academic Advisor', label: 'Academic Advisor' },
                { value: 'Admin', label: 'System Administrator (Admin)' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="password"
            label="Reset Password (leave blank to keep existing password)"
          >
            <Input.Password placeholder="Enter new password if resetting" />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setEditUser(null)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Save Changes
            </Button>
          </div>
        </Form>
      </Modal>
    </Space>
  );
};
