import React, { useState, useEffect, useCallback } from 'react'
import {
  Table, Button, Modal, Form, Input, Space, message,
  Popconfirm, Typography, Card, Tag, Divider,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, FileMarkdownOutlined,
} from '@ant-design/icons'
import { Solution } from '../../types'
import {
  solutionService, CreateSolutionRequest, UpdateSolutionRequest,
} from '../../services/solutionService'
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
      targetCustomers: solution.targetCustomers,
      solutionContent: solution.solutionContent,
      solutionSource: solution.solutionSource,
      awsServices: solution.awsServices,
      whyAws: solution.whyAws,
      promotionKeyPoints: solution.promotionKeyPoints,
      faq: solution.faq,
      keyTerms: solution.keyTerms,
      successCases: solution.successCases,
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
      const ext = {
        targetCustomers: values.targetCustomers || undefined,
        solutionContent: values.solutionContent || undefined,
        solutionSource: values.solutionSource || undefined,
        awsServices: values.awsServices || undefined,
        whyAws: values.whyAws || undefined,
        promotionKeyPoints: values.promotionKeyPoints || undefined,
        faq: values.faq || undefined,
        keyTerms: values.keyTerms || undefined,
        successCases: values.successCases || undefined,
      }
      if (editingSolution) {
        const d: UpdateSolutionRequest = {
          name: values.name, description: values.description, ...ext,
        }
        await solutionService.update(editingSolution.id, d)
        message.success('解决方案更新成功')
      } else {
        const d: CreateSolutionRequest = {
          name: values.name, description: values.description, ...ext,
        }
        await solutionService.create(d)
        message.success('解决方案创建成功')
      }
      setModalVisible(false)
      form.resetFields()
      setEditingSolution(null)
      await fetchSolutions()
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkdownUpload = async (content: string) => {
    if (!selectedSolution) return
    await solutionService.uploadMarkdown(
      selectedSolution.id, { markdownContent: content },
    )
    await fetchSolutions()
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
        url ? (
          <Tag color="green">已上传</Tag>
        ) : (
          <Tag color="default">未上传</Tag>
        ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) =>
        new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 250,
      fixed: 'right' as const,
      render: (_: unknown, record: Solution) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          解决方案管理
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          新增解决方案
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={solutions}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showTotal: (total) => `共 ${total} 条`,
        }}
        scroll={{ x: 1000 }}
      />

      <Modal
        title={
          editingSolution ? '编辑解决方案' : '新增解决方案'
        }
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
        width={1040}
        style={{ top: 20 }}
        styles={{
          body: {
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
          },
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="解决方案名称"
            rules={[
              { required: true, message: '请输入解决方案名称' },
              { max: 100, message: '名称不能超过100个字符' },
            ]}
          >
            <Input placeholder="请输入解决方案名称" />
          </Form.Item>
          <Form.Item
            name="description"
            label="解决方案描述"
            rules={[
              { required: true, message: '请输入解决方案描述' },
              { max: 500, message: '描述不能超过500个字符' },
            ]}
          >
            <TextArea rows={3} placeholder="请输入解决方案描述" />
          </Form.Item>
          <Form.Item
            name="targetCustomers"
            label="适用客户群体（支持Markdown）"
          >
            <TextArea
              rows={4}
              placeholder="请输入适用客户群体描述，支持Markdown格式"
            />
          </Form.Item>
          <Form.Item
            name="solutionContent"
            label="方案内容（支持Markdown）"
          >
            <TextArea
              rows={6}
              placeholder="请输入方案内容，支持Markdown格式"
            />
          </Form.Item>
          <Form.Item
            name="solutionSource"
            label="方案来源（支持Markdown）"
          >
            <TextArea
              rows={4}
              placeholder="请输入方案来源，支持Markdown格式"
            />
          </Form.Item>
          <Form.Item
            name="awsServices"
            label="主要使用的AWS服务（支持Markdown）"
          >
            <TextArea
              rows={4}
              placeholder="请输入主要使用的AWS服务，支持Markdown格式"
            />
          </Form.Item>
          <Form.Item
            name="whyAws"
            label="Why AWS（支持Markdown）"
          >
            <TextArea
              rows={4}
              placeholder="请输入Why AWS说明，支持Markdown格式"
            />
          </Form.Item>
          <Form.Item
            name="promotionKeyPoints"
            label="方案推广关键点（支持Markdown）"
          >
            <TextArea
              rows={4}
              placeholder="请输入方案推广关键点，支持Markdown格式"
            />
          </Form.Item>
          <Form.Item
            name="faq"
            label="客户常见问题解答（支持Markdown）"
          >
            <TextArea
              rows={4}
              placeholder="请输入客户常见问题解答，支持Markdown格式"
            />
          </Form.Item>
          <Form.Item
            name="keyTerms"
            label="关键术语说明（支持Markdown）"
          >
            <TextArea
              rows={4}
              placeholder="请输入关键术语说明，支持Markdown格式"
            />
          </Form.Item>
          <Form.Item
            name="successCases"
            label="成功案例（支持Markdown）"
          >
            <TextArea
              rows={4}
              placeholder="请输入成功案例，支持Markdown格式"
            />
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
              <Text type="success">
                ✓ 已上传详细介绍文件
              </Text>
              <Divider />
              <Text type="secondary">
                上传新文件将覆盖现有文件
              </Text>
            </>
          ) : (
            <Text type="secondary">
              尚未上传详细介绍文件
            </Text>
          )}
          <MarkdownUploader onUpload={handleMarkdownUpload} />
        </div>
      </Modal>
    </Card>
  )
}

export default SolutionManagement
