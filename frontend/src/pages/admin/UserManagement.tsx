import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tag,
  Typography,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons'
import { userService, CreateUserRequest, UpdateUserRequest } from '../../services/userService'
import { industryService } from '../../services/industryService'
import { User, Industry } from '../../types'

const { Title } = Typography
const { Option } = Select

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadUsers()
    loadIndustries()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await userService.list()
      setUsers(data)
    } catch (error: any) {
      message.error(error.message || '加载用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  const loadIndustries = async () => {
    try {
      const data = await industryService.list()
      setIndustries(data)
    } catch (error: any) {
      console.error('加载行业列表失败:', error)
    }
  }

  const handleCreate = () => {
    setEditingUser(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    form.setFieldsValue({
      email: user.email,
      role: user.role,
      assignedIndustries: user.assignedIndustries || [],
    })
    setModalVisible(true)
  }

  const handleDelete = async (userId: string) => {
    try {
      await userService.delete(userId)
      message.success('删除用户成功')
      loadUsers()
    } catch (error: any) {
      message.error(error.message || '删除用户失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      if (editingUser) {
        // Update existing user
        const updateData: UpdateUserRequest = {
          role: values.role,
          assignedIndustries: values.role === 'specialist' ? values.assignedIndustries : undefined,
        }
        await userService.update(editingUser.userId, updateData)
        message.success('更新用户成功')
      } else {
        // Create new user
        const createData: CreateUserRequest = {
          email: values.email,
          role: values.role,
          assignedIndustries: values.role === 'specialist' ? values.assignedIndustries : undefined,
        }
        await userService.create(createData)
        message.success('创建用户成功')
      }
      
      setModalVisible(false)
      form.resetFields()
      loadUsers()
    } catch (error: any) {
      message.error(error.message || '操作失败')
    }
  }

  const getRoleTag = (role: string) => {
    const roleMap = {
      admin: { color: 'red', text: '管理员' },
      specialist: { color: 'blue', text: '行业专员' },
      user: { color: 'green', text: '普通用户' },
    }
    const config = roleMap[role as keyof typeof roleMap] || { color: 'default', text: role }
    return <Tag color={config.color}>{config.text}</Tag>
  }

  const columns = [
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => getRoleTag(role),
    },
    {
      title: '分配的行业',
      dataIndex: 'assignedIndustries',
      key: 'assignedIndustries',
      render: (assignedIndustries: string[] | undefined) => {
        if (!assignedIndustries || assignedIndustries.length === 0) {
          return <span style={{ color: '#999' }}>无</span>
        }
        return (
          <Space wrap>
            {assignedIndustries.map((industryId) => {
              const industry = industries.find((i) => i.id === industryId)
              return (
                <Tag key={industryId} color="blue">
                  {industry?.name || industryId}
                </Tag>
              )
            })}
          </Space>
        )
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: User) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个用户吗？"
            onConfirm={() => handleDelete(record.userId)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const selectedRole = Form.useWatch('role', form)

  return (
    <div>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={3}>
              <UserOutlined /> 用户管理
            </Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              创建用户
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={users}
            rowKey="userId"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 个用户`,
            }}
          />
        </Space>
      </Card>

      <Modal
        title={editingUser ? '编辑用户' : '创建用户'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            role: 'user',
            assignedIndustries: [],
          }}
        >
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              placeholder="user@example.com"
              disabled={!!editingUser}
            />
          </Form.Item>

          <Form.Item
            label="角色"
            name="role"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="选择角色">
              <Option value="admin">管理员</Option>
              <Option value="specialist">行业专员</Option>
              <Option value="user">普通用户</Option>
            </Select>
          </Form.Item>

          {selectedRole === 'specialist' && (
            <Form.Item
              label="分配的行业"
              name="assignedIndustries"
              rules={[{ required: true, message: '请至少选择一个行业' }]}
            >
              <Select
                mode="multiple"
                placeholder="选择行业"
                showSearch
                optionFilterProp="children"
              >
                {industries.map((industry) => (
                  <Option key={industry.id} value={industry.id}>
                    {industry.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}

export default UserManagement
