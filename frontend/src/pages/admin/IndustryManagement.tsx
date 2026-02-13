import React, { useState, useEffect, useCallback } from 'react'
import {
  Table, Button, Modal, Form, Input, Switch, Space, message,
  Popconfirm, Typography, Card,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  EyeOutlined, EyeInvisibleOutlined,
} from '@ant-design/icons'
import { Industry } from '../../types'
import { industryService, CreateIndustryRequest, UpdateIndustryRequest } from '../../services/industryService'
import { CSVImporter } from '../../components/CSVImporter'
import { commonValidationRules } from '../../utils/validation'

const { Title } = Typography
const { TextArea } = Input

const IndustryManagement: React.FC = () => {
  const [industries, setIndustries] = useState<Industry[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingIndustry, setEditingIndustry] = useState<Industry | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const fetchIndustries = useCallback(async () => {
    setLoading(true)
    try {
      const data = await industryService.list()
      setIndustries(data)
    } catch (error: any) {
      message.error(error.message || '获取行业列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIndustries()
  }, [fetchIndustries])

  const handleCreate = () => {
    setEditingIndustry(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (industry: Industry) => {
    setEditingIndustry(industry)
    form.setFieldsValue({
      name: industry.name,
      definition: industry.definition,
      definitionCn: industry.definitionCn,
    })
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      if (editingIndustry) {
        const updateData: UpdateIndustryRequest = {
          name: values.name,
          definition: values.definition,
          definitionCn: values.definitionCn,
        }
        await industryService.update(editingIndustry.id, updateData)
        message.success('行业更新成功')
      } else {
        const createData: CreateIndustryRequest = {
          name: values.name,
          definition: values.definition,
          definitionCn: values.definitionCn,
        }
        await industryService.create(createData)
        message.success('行业创建成功')
      }

      setModalVisible(false)
      form.resetFields()
      setEditingIndustry(null)
      await fetchIndustries()
    } catch (error: any) {
      if (error.errorFields) return // form validation error
      message.error(error.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await industryService.delete(id)
      message.success('行业删除成功')
      await fetchIndustries()
    } catch (error: any) {
      message.error(error.message || '删除失败')
    }
  }

  const handleToggleVisibility = async (industry: Industry) => {
    try {
      await industryService.setVisibility(industry.id, !industry.isVisible)
      message.success(`行业已${industry.isVisible ? '隐藏' : '显示'}`)
      await fetchIndustries()
    } catch (error: any) {
      message.error(error.message || '设置可见性失败')
    }
  }

  const columns = [
    {
      title: '行业名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '行业定义（英文）',
      dataIndex: 'definition',
      key: 'definition',
      render: (text: string) => (
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text}</div>
      ),
    },
    {
      title: '行业定义（中文）',
      dataIndex: 'definitionCn',
      key: 'definitionCn',
      render: (text: string) => (
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text || '-'}</div>
      ),
    },
    {
      title: '可见性',
      dataIndex: 'isVisible',
      key: 'isVisible',
      width: 100,
      render: (isVisible: boolean, record: Industry) => (
        <Switch
          checked={isVisible}
          onChange={() => handleToggleVisibility(record)}
          checkedChildren={<EyeOutlined />}
          unCheckedChildren={<EyeInvisibleOutlined />}
        />
      ),
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
      width: 150,
      render: (_: unknown, record: Industry) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此行业吗？"
            description="如果该行业下有子行业，将无法删除。"
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
        <Title level={4} style={{ margin: 0 }}>行业管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新增行业
        </Button>
      </div>

      <CSVImporter onImportComplete={fetchIndustries} />

      <Table
        columns={columns}
        dataSource={industries}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
      />

      <Modal
        title={editingIndustry ? '编辑行业' : '新增行业'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
          setEditingIndustry(null)
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
            name="name"
            label="行业名称"
            rules={commonValidationRules.name}
          >
            <Input placeholder="请输入行业名称" maxLength={100} showCount />
          </Form.Item>
          <Form.Item
            name="definition"
            label="行业定义（英文）"
            rules={commonValidationRules.description}
          >
            <TextArea rows={8} placeholder="请输入行业定义（英文）" maxLength={500} showCount />
          </Form.Item>
          <Form.Item
            name="definitionCn"
            label="行业定义（中文）"
            rules={[{ max: 500, message: '行业定义不能超过500个字符' }]}
          >
            <TextArea rows={8} placeholder="请输入行业定义（中文）" maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

export default IndustryManagement
