import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  message,
  Popconfirm,
  Typography,
  Card,
  Tag,
  Divider,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, FileMarkdownOutlined } from '@ant-design/icons'
import { Solution } from '../../types'
import { solutionService, CreateSolutionRequest, UpdateSolutionRequest } from '../../services/solutionService'
import { MarkdownUploader } from '../../components/MarkdownUploader'

const { Title, Text } = Typography
const { TextArea } = Input

const SolutionManagement: React.FC = () => {
  const [solutions, setSolutions] = useState<Solution[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [markdownModalVisible, setMarkdownModalVisible] = useState(false)
  const [editingSolution, setEditingSolution] = useState<Solution | null>(null)
  const [selectedSolution, setSelectedSolution] = useState<Solution | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const fetchSolutions = useCallback(async () => {
    setLoading(true)
    try {
      const data = await solutionService.list()
      setSolutions(data)
    } catch (error: any) {
      message.error(error.message || '获取解决方案列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSolutions()
  }, [fetchSolutions])

  const handleCreate = () => {
    setEditingSolution(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (solution: Solution) => {
    setEditingSolution(solution)
    form.setFieldsValue({
      name: solution.name,
      description: solution.description,
    })
    setModalVisible(true)
  }

  const handleManageMarkdown = (solution: Solution) => {
    setSelectedSolution(solution)
    setMarkdownModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      if (editingSolution) {
        const updateData: UpdateSolutionRequest = {
          name: values.name,
          description: values.description,
        }
        await solutionService.update(editingSolution.id, updateData)
        message.success('解决方案更新成功')
      } else {
        const createData: CreateSolutionRequest = {
          name: values.name,
          description: values.description,
        }
        await solutionService.create(createData)
        message.success('解决方案创建成功')
      }

      setModalVisible(false)
      form.resetFields()
      setEditingSolution(null)
      await fetchSolutions()
    } catch (error: any) {
      if (error.errorFields) return // form validation error
      message.error(error.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkdownUpload = async (content: string) => {
    if (!selectedSolution) return

    try {
      await solutionService.uploadMarkdown(selectedSolution.id, { markdownContent: content })
      await fetchSolutions()
    } catch (error: any) {
      throw error
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await solutionService.delete(id)
      message.success('解决方案删除成功')
      await fetchSolutions()
    } catch (error: any) {
      message.error(error.message || '删除失败')
    }
  }

  const columns = [
    {
      title: '解决方案名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '详细介绍',
      dataIndex: 'detailMarkdownUrl',
      key: 'detailMarkdownUrl',
      width: 120,
      render: (url: string) =>
        url ? <Tag color="green">已上传</Tag> : <Tag color="default">未上传</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 250,
      fixed: 'right' as const,
      render: (_: unknown, record: Solution) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button
            type="link"
            icon={<FileMarkdownOutlined />}
            onClick={() => handleManageMarkdown(record)}
          >
            详细介绍
          </Button>
          <Popconfirm
            title="确定要删除此解决方案吗？"
            description="如果该解决方案被客户案例引用，将无法删除。"
            onConfirm={() => handleDelete(record.id)}
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

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          解决方案管理
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新增解决方案
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={solutions}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
        scroll={{ x: 1000 }}
      />

      <Modal
        title={editingSolution ? '编辑解决方案' : '新增解决方案'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
          setEditingSolution(null)
        }}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="解决方案名称"
            rules={[
              { required: true, message: '请输入解决方案名称' },
              { max: 100, message: '解决方案名称不能超过100个字符' },
            ]}
          >
            <Input placeholder="请输入解决方案名称" />
          </Form.Item>
          <Form.Item
            name="description"
            label="解决方案描述"
            rules={[
              { required: true, message: '请输入解决方案描述' },
              { max: 500, message: '解决方案描述不能超过500个字符' },
            ]}
          >
            <TextArea rows={4} placeholder="请输入解决方案描述" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`管理详细介绍 - ${selectedSolution?.name}`}
        open={markdownModalVisible}
        onCancel={() => {
          setMarkdownModalVisible(false)
          setSelectedSolution(null)
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setMarkdownModalVisible(false)
              setSelectedSolution(null)
            }}
          >
            关闭
          </Button>,
        ]}
        width={600}
      >
        <div>
          {selectedSolution?.detailMarkdownUrl ? (
            <>
              <Text type="success">✓ 已上传详细介绍文件</Text>
              <Divider />
              <Text type="secondary">上传新文件将覆盖现有文件</Text>
            </>
          ) : (
            <Text type="secondary">尚未上传详细介绍文件</Text>
          )}
          <MarkdownUploader onUpload={handleMarkdownUpload} />
        </div>
      </Modal>
    </Card>
  )
}

export default SolutionManagement
