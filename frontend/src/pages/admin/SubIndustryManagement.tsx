import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  message,
  Popconfirm,
  Typography,
  Card,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SwapOutlined } from '@ant-design/icons'
import { SubIndustry, Industry } from '../../types'
import {
  subIndustryService,
  CreateSubIndustryRequest,
  UpdateSubIndustryRequest,
} from '../../services/subIndustryService'
import { industryService } from '../../services/industryService'

const { Title } = Typography
const { TextArea } = Input
const { Option } = Select

const SubIndustryManagement: React.FC = () => {
  const [subIndustries, setSubIndustries] = useState<SubIndustry[]>([])
  const [filteredSubIndustries, setFilteredSubIndustries] = useState<SubIndustry[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
  const [selectedIndustryId, setSelectedIndustryId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [moveModalVisible, setMoveModalVisible] = useState(false)
  const [editingSubIndustry, setEditingSubIndustry] = useState<SubIndustry | null>(null)
  const [movingSubIndustry, setMovingSubIndustry] = useState<SubIndustry | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()
  const [moveForm] = Form.useForm()

  const fetchSubIndustries = useCallback(async () => {
    setLoading(true)
    try {
      const data = await subIndustryService.listAll()
      setSubIndustries(data)
    } catch (error: any) {
      message.error(error.message || '获取子行业列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchIndustries = useCallback(async () => {
    try {
      const data = await industryService.list()
      setIndustries(data)
    } catch (error: any) {
      message.error(error.message || '获取行业列表失败')
    }
  }, [])

  useEffect(() => {
    fetchSubIndustries()
    fetchIndustries()
  }, [fetchSubIndustries, fetchIndustries])

  useEffect(() => {
    if (selectedIndustryId) {
      setFilteredSubIndustries(subIndustries.filter((s) => s.industryId === selectedIndustryId))
    } else {
      setFilteredSubIndustries(subIndustries)
    }
  }, [selectedIndustryId, subIndustries])

  const handleCreate = () => {
    setEditingSubIndustry(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (subIndustry: SubIndustry) => {
    setEditingSubIndustry(subIndustry)
    form.setFieldsValue({
      industryId: subIndustry.industryId,
      name: subIndustry.name,
      definition: subIndustry.definition,
      definitionCn: subIndustry.definitionCn,
      typicalGlobalCompanies: subIndustry.typicalGlobalCompanies?.join(', ') || '',
      typicalChineseCompanies: subIndustry.typicalChineseCompanies?.join(', ') || '',
    })
    setModalVisible(true)
  }

  const handleMove = (subIndustry: SubIndustry) => {
    setMovingSubIndustry(subIndustry)
    moveForm.setFieldsValue({ newIndustryId: subIndustry.industryId })
    setMoveModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      // Parse company lists
      const typicalGlobalCompanies = values.typicalGlobalCompanies
        ? values.typicalGlobalCompanies
            .split(',')
            .map((c: string) => c.trim())
            .filter((c: string) => c.length > 0)
        : []

      const typicalChineseCompanies = values.typicalChineseCompanies
        ? values.typicalChineseCompanies
            .split(',')
            .map((c: string) => c.trim())
            .filter((c: string) => c.length > 0)
        : []

      if (editingSubIndustry) {
        const updateData: UpdateSubIndustryRequest = {
          name: values.name,
          definition: values.definition,
          definitionCn: values.definitionCn,
          typicalGlobalCompanies,
          typicalChineseCompanies,
        }
        await subIndustryService.update(editingSubIndustry.id, updateData)
        message.success('子行业更新成功')
      } else {
        const createData: CreateSubIndustryRequest = {
          industryId: values.industryId,
          name: values.name,
          definition: values.definition,
          definitionCn: values.definitionCn,
          typicalGlobalCompanies,
          typicalChineseCompanies,
        }
        await subIndustryService.create(createData)
        message.success('子行业创建成功')
      }

      setModalVisible(false)
      form.resetFields()
      setEditingSubIndustry(null)
      await fetchSubIndustries()
    } catch (error: any) {
      if (error.errorFields) return // form validation error
      message.error(error.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMoveSubmit = async () => {
    if (!movingSubIndustry) return

    try {
      const values = await moveForm.validateFields()
      setSubmitting(true)

      await subIndustryService.move(movingSubIndustry.id, { newIndustryId: values.newIndustryId })
      message.success('子行业移动成功')

      setMoveModalVisible(false)
      moveForm.resetFields()
      setMovingSubIndustry(null)
      await fetchSubIndustries()
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.message || '移动失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await subIndustryService.delete(id)
      message.success('子行业删除成功')
      await fetchSubIndustries()
    } catch (error: any) {
      message.error(error.message || '删除失败')
    }
  }

  const columns = [
    {
      title: '子行业名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '子行业定义（英文）',
      dataIndex: 'definition',
      key: 'definition',
      render: (text: string) => (
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text}</div>
      ),
    },
    {
      title: '子行业定义（中文）',
      dataIndex: 'definitionCn',
      key: 'definitionCn',
      render: (text: string) => (
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text || '-'}</div>
      ),
    },
    {
      title: '典型全球企业',
      dataIndex: 'typicalGlobalCompanies',
      key: 'typicalGlobalCompanies',
      width: 200,
      render: (companies: string[]) => (companies && companies.length > 0 ? companies.join(', ') : '-'),
    },
    {
      title: '典型中国企业',
      dataIndex: 'typicalChineseCompanies',
      key: 'typicalChineseCompanies',
      width: 200,
      render: (companies: string[]) => (companies && companies.length > 0 ? companies.join(', ') : '-'),
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
      width: 200,
      fixed: 'right' as const,
      render: (_: unknown, record: SubIndustry) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" icon={<SwapOutlined />} onClick={() => handleMove(record)}>
            移动
          </Button>
          <Popconfirm
            title="确定要删除此子行业吗？"
            description="如果该子行业下有用例，将无法删除。"
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
          子行业管理
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新增子行业
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Select
          placeholder="选择行业筛选"
          style={{ width: 300 }}
          allowClear
          value={selectedIndustryId}
          onChange={setSelectedIndustryId}
        >
          {industries.map((industry) => (
            <Option key={industry.id} value={industry.id}>
              {industry.name}
            </Option>
          ))}
        </Select>
      </div>

      <Table
        columns={columns}
        dataSource={filteredSubIndustries}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
        scroll={{ x: 1200 }}
      />

      <Modal
        title={editingSubIndustry ? '编辑子行业' : '新增子行业'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
          setEditingSubIndustry(null)
        }}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        width={1040}
        style={{ top: 20 }}
        bodyStyle={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="industryId"
            label="所属行业"
            rules={[{ required: true, message: '请选择所属行业' }]}
          >
            <Select placeholder="请选择所属行业" disabled={!!editingSubIndustry}>
              {industries.map((industry) => (
                <Option key={industry.id} value={industry.id}>
                  {industry.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="name"
            label="子行业名称"
            rules={[
              { required: true, message: '请输入子行业名称' },
              { max: 100, message: '子行业名称不能超过100个字符' },
            ]}
          >
            <Input placeholder="请输入子行业名称" />
          </Form.Item>
          <Form.Item
            name="definition"
            label="子行业定义（英文）"
            rules={[
              { required: true, message: '请输入子行业定义' },
              { max: 500, message: '子行业定义不能超过500个字符' },
            ]}
          >
            <TextArea rows={6} placeholder="请输入子行业定义（英文）" />
          </Form.Item>
          <Form.Item
            name="definitionCn"
            label="子行业定义（中文）"
            rules={[{ max: 500, message: '子行业定义不能超过500个字符' }]}
          >
            <TextArea rows={6} placeholder="请输入子行业定义（中文）" />
          </Form.Item>
          <Form.Item name="typicalGlobalCompanies" label="典型全球企业（用逗号分隔）">
            <Input placeholder="例如：Google, Microsoft, Amazon" />
          </Form.Item>
          <Form.Item name="typicalChineseCompanies" label="典型中国企业（用逗号分隔）">
            <Input placeholder="例如：阿里巴巴, 腾讯, 百度" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="移动子行业"
        open={moveModalVisible}
        onOk={handleMoveSubmit}
        onCancel={() => {
          setMoveModalVisible(false)
          moveForm.resetFields()
          setMovingSubIndustry(null)
        }}
        confirmLoading={submitting}
        okText="移动"
        cancelText="取消"
      >
        <Form form={moveForm} layout="vertical">
          <p>
            将子行业 <strong>{movingSubIndustry?.name}</strong> 移动到：
          </p>
          <Form.Item
            name="newIndustryId"
            label="目标行业"
            rules={[{ required: true, message: '请选择目标行业' }]}
          >
            <Select placeholder="请选择目标行业">
              {industries.map((industry) => (
                <Option key={industry.id} value={industry.id}>
                  {industry.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

export default SubIndustryManagement
