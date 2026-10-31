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
      message.error(err.response?.data?.detail || 'Không thể tải danh sách tài khoản');
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
        message="Không có quyền truy cập"
        description="Chức năng quản trị tài khoản chỉ dành cho Quản trị viên hệ thống (Admin)."
      />
    );
  }

  const handleCreate = async (values: any) => {
    setSubmitting(true);
    try {
      await api.post('/api/users', values);
      message.success('Đã tạo tài khoản mới thành công!');
      setCreateOpen(false);
      createForm.resetFields();
      fetchUsers();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Không thể tạo tài khoản');
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
      message.success('Đã cập nhật thông tin tài khoản!');
      setEditUser(null);
      fetchUsers();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Không thể cập nhật tài khoản');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (u: UserOut) => {
    try {
      await api.delete(`/api/users/${u.id}`);
      message.success(`Đã xóa tài khoản @${u.username}`);
      fetchUsers();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Không thể xóa tài khoản');
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
            Quản trị Tài khoản & Phân quyền (RBAC)
          </Title>
          <Text type="secondary">
            Cấp phát và quản lý quyền truy cập cho Cố vấn học tập (Academic Advisor) và Quản trị
            viên (Admin).
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
          Tạo tài khoản mới
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
              title: 'Tên đăng nhập',
              dataIndex: 'username',
              render: (u: string) => <Text strong>@{u}</Text>,
            },
            {
              title: 'Họ và tên cán bộ',
              dataIndex: 'full_name',
            },
            {
              title: 'Vai trò hệ thống',
              dataIndex: 'role',
              render: (role: string) => (
                <Tag color={role === 'Admin' ? 'blue' : 'cyan'} style={{ fontWeight: 600 }}>
                  {role === 'Admin' ? 'Quản trị viên (Admin)' : 'Cố vấn Học tập (Academic Advisor)'}
                </Tag>
              ),
            },
            {
              title: 'Thao tác',
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
                    Sửa
                  </Button>
                  <Popconfirm
                    title={`Xác nhận xóa tài khoản @${u.username}?`}
                    onConfirm={() => handleDelete(u)}
                    okText="Xóa"
                    cancelText="Hủy"
                    disabled={u.id === currentUser?.id}
                  >
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={u.id === currentUser?.id}
                    >
                      Xóa
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
        title="Tạo Tài khoản Cán bộ Mới"
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
            label="Tên đăng nhập"
            rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
          >
            <Input placeholder="Ví dụ: advisor02" />
          </Form.Item>
          <Form.Item
            name="full_name"
            label="Họ và tên đầy đủ"
            rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
          >
            <Input placeholder="Ví dụ: ThS. Nguyễn Văn A" />
          </Form.Item>
          <Form.Item
            name="role"
            label="Vai trò phân quyền"
            rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
          >
            <Select
              options={[
                { value: 'Academic Advisor', label: 'Cố vấn Học tập (Academic Advisor)' },
                { value: 'Admin', label: 'Quản trị viên hệ thống (Admin)' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="password"
            label="Mật khẩu khởi tạo"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu' },
              { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' },
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu khởi tạo" />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={submitting}>
              Tạo tài khoản
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        title={`Cập nhật Tài khoản @${editUser?.username}`}
        open={!!editUser}
        onCancel={() => setEditUser(null)}
        footer={null}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item
            name="full_name"
            label="Họ và tên đầy đủ"
            rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="role"
            label="Vai trò phân quyền"
            rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
          >
            <Select
              disabled={editUser?.id === currentUser?.id}
              options={[
                { value: 'Academic Advisor', label: 'Cố vấn Học tập (Academic Advisor)' },
                { value: 'Admin', label: 'Quản trị viên hệ thống (Admin)' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="password"
            label="Đặt lại mật khẩu mới (Để trống nếu giữ nguyên mật khẩu cũ)"
          >
            <Input.Password placeholder="Nhập mật khẩu mới nếu cần đổi" />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setEditUser(null)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Lưu thay đổi
            </Button>
          </div>
        </Form>
      </Modal>
    </Space>
  );
};

