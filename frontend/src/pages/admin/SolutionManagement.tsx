import React, { useState, useEffect, useCallback } from 'react'
import {
  Table, Button, Modal, Form, Input, Space, message,
  Popconfirm, Typography, Card, Tag, Divider, Select,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, FileMarkdownOutlined,
} from '@ant-design/icons'
import { Solution, Industry } from '../../types'
import {
  solutionService, CreateSolutionRequest, UpdateSolutionRequest,
} from '../../services/solutionService'
import { industryService } from '../../services/industryService'
import { SolutionMarkdownEditor } from '../../components/SolutionMarkdownEditor'

const { Title, Text } = Typography
const { TextArea } = Input

const SolutionManagement: React.FC = () => {
  const [solutions, setSolutions] = useState<Solution[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [markdownModalVisible, setMarkdownModalVisible] = useState(false)
  const [editingSolution, setEditingSolution] = useState<Solution | null>(null)
  const [selectedSolution, setSelectedSolution] = useState<Solution | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loadingMarkdown, setLoadingMarkdown] = useState(false)
  const [markdownFields, setMarkdownFields] = useState<any>(null)
  const [form] = Form.useForm()

  const fetchIndustries = useCallback(async () => {
    try {
      const data = await industryService.list()
      setIndustries(data)
    } catch (error: any) {
      message.error(error.message || '获取行业列表失败')
    }
  }, [])

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
    fetchIndustries()
    fetchSolutions()
  }, [fetchIndustries, fetchSolutions])

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
      industryIds: solution.industryIds || [],
    })
    setModalVisible(true)
  }

  const handleManageMarkdown = async (solution: Solution) => {
    setSelectedSolution(solution)
    setMarkdownFields(null)
    
    // Load existing markdown content if available
    if (solution.detailMarkdownUrl) {
      setLoadingMarkdown(true)
      try {
        const response = await solutionService.getMarkdownUrl(solution.id)
        if (response.fields) {
          setMarkdownFields(response.fields)
        }
      } catch (error: any) {
        console.error('Failed to load markdown:', error)
        message.warning('无法加载现有内容，将创建新内容')
      } finally {
        setLoadingMarkdown(false)
      }
    }
    
    setMarkdownModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      
      if (editingSolution) {
        const d: UpdateSolutionRequest = {
          name: values.name,
          description: values.description,
          industryIds: values.industryIds || [],
        }
        await solutionService.update(editingSolution.id, d)
        message.success('解决方案更新成功')
      } else {
        const d: CreateSolutionRequest = {
          name: values.name,
          description: values.description,
          industryIds: values.industryIds || [],
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

  const handleMarkdownUpload = async (data: {
    targetCustomers?: string
    solutionContent?: string
    solutionSource?: string
    awsServices?: string
    whyAws?: string
    promotionKeyPoints?: string
    faq?: string
    keyTerms?: string
    successCases?: string
  }) => {
    if (!selectedSolution) return
    
    try {
      // Generate markdown content from fields
      let markdownContent = ''
      
      if (data.targetCustomers) {
        markdownContent += `## 适用客户群体\n\n${data.targetCustomers}\n\n`
      }
      if (data.solutionContent) {
        markdownContent += `## 方案内容\n\n${data.solutionContent}\n\n`
      }
      if (data.solutionSource) {
        markdownContent += `## 方案来源\n\n${data.solutionSource}\n\n`
      }
      if (data.awsServices) {
        markdownContent += `## 主要使用的AWS服务\n\n${data.awsServices}\n\n`
      }
      if (data.whyAws) {
        markdownContent += `## Why AWS\n\n${data.whyAws}\n\n`
      }
      if (data.promotionKeyPoints) {
        markdownContent += `## 方案推广关键点\n\n${data.promotionKeyPoints}\n\n`
      }
      if (data.faq) {
        markdownContent += `## 客户常见问题解答\n\n${data.faq}\n\n`
      }
      if (data.keyTerms) {
        markdownContent += `## 关键术语说明\n\n${data.keyTerms}\n\n`
      }
      if (data.successCases) {
        markdownContent += `## 成功案例\n\n${data.successCases}\n\n`
      }
      
      await solutionService.uploadMarkdown(
        selectedSolution.id,
        { markdownContent, ...data }
      )
      await fetchSolutions()
      
      // Close modal and show success message
      message.success('详细介绍上传成功')
      setMarkdownModalVisible(false)
      setSelectedSolution(null)
      setMarkdownFields(null)
    } catch (error: any) {
      message.error(error.message || '上传失败')
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
        width={800}
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
            name="industryIds"
            label="所属行业"
            tooltip="选择此解决方案所属的行业，行业专员只能看到他们负责行业的解决方案"
          >
            <Select
              mode="multiple"
              placeholder="请选择所属行业（可多选）"
              options={industries.map((industry) => ({
                label: industry.name,
                value: industry.id,
              }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
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
          setMarkdownFields(null)
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setMarkdownModalVisible(false)
              setSelectedSolution(null)
              setMarkdownFields(null)
            }}
          >
            关闭
          </Button>,
        ]}
        width={1040}
        style={{ top: 20 }}
        styles={{
          body: {
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
          },
        }}
      >
        <div>
          {selectedSolution?.detailMarkdownUrl ? (
            <>
              <Text type="success">
                ✓ 已上传详细介绍文件
              </Text>
              <Divider />
              <Text type="secondary">
                修改后保存将覆盖现有文件
              </Text>
            </>
          ) : (
            <Text type="secondary">
              尚未上传详细介绍文件
            </Text>
          )}
          {loadingMarkdown ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Text>加载现有内容中...</Text>
            </div>
          ) : (
            <SolutionMarkdownEditor 
              onUpload={handleMarkdownUpload}
              initialValues={markdownFields}
            />
          )}
        </div>
      </Modal>
    </Card>
  )
}

export default SolutionManagement
