import React, { useState, useEffect, useCallback } from 'react'
import { Card, Table, Button, Modal, Form, Input, Select, message, Space, Popconfirm, Typography } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { subIndustryService, CreateSubIndustryRequest, UpdateSubIndustryRequest } from '../../services/subIndustryService'
import { industryService } from '../../services/industryService'
import { SubIndustry, Industry } from '../../types'

const { Title } = Typography
const { TextArea } = Input
const { Option } = Select

const Tier3SubIndustryManagement: React.FC = () => {
  const [tier3SubIndustries, setTier3SubIndustries] = useState<SubIndustry[]>([])
  const [filteredTier3SubIndustries, setFilteredTier3SubIndustries] = useState<SubIndustry[]>([])
  const [tier2SubIndustries, setTier2SubIndustries] = useState<SubIndustry[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingSubIndustry, setEditingSubIndustry] = useState<SubIndustry | null>(null)
  const [selectedIndustryFilter, setSelectedIndustryFilter] = useState<string | undefined>(undefined)
  const [selectedTier2Filter, setSelectedTier2Filter] = useState<string | undefined>(undefined)
  const [form] = Form.useForm()

  const fetchSubIndustries = useCallback(async () => {
    setLoading(true)
    try {
      const data = await subIndustryService.list()
      // 兼容后端不返回level字段的情况：用parentSubIndustryId判断层级
      // 有parentSubIndustryId的是Tier3，没有的是Tier2
      const tier3 = data.filter((si) => si.level === 'Tier3' || si.parentSubIndustryId)
      const tier2 = data.filter((si) =>
        si.level === 'Tier2-individual' || si.level === 'Tier2-Group' || (!si.level && !si.parentSubIndustryId)
      )
      
      // 排序：按所属行业、所属2级子行业、3级子行业名称首字母排序
      tier3.sort((a, b) => {
        const industryA = getIndustryName(a.industryId)
        const industryB = getIndustryName(b.industryId)
        if (industryA !== industryB) {
          return industryA.localeCompare(industryB, 'zh-CN')
        }
        
        const parentA = getParentSubIndustryName(a.parentSubIndustryId)
        const parentB = getParentSubIndustryName(b.parentSubIndustryId)
        if (parentA !== parentB) {
          return parentA.localeCompare(parentB, 'zh-CN')
        }
        
        return a.name.localeCompare(b.name, 'zh-CN')
      })
      
      setTier3SubIndustries(tier3)
      setFilteredTier3SubIndustries(tier3)
      setTier2SubIndustries(tier2)
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

  // 筛选逻辑
  useEffect(() => {
    let filtered = [...tier3SubIndustries]
    
    if (selectedIndustryFilter) {
      filtered = filtered.filter(si => si.industryId === selectedIndustryFilter)
    }
    
    if (selectedTier2Filter) {
      filtered = filtered.filter(si => si.parentSubIndustryId === selectedTier2Filter)
    }
    
    setFilteredTier3SubIndustries(filtered)
  }, [selectedIndustryFilter, selectedTier2Filter, tier3SubIndustries])

  const handleIndustryFilterChange = (value: string | undefined) => {
    setSelectedIndustryFilter(value)
    setSelectedTier2Filter(undefined) // 重置2级子行业筛选
  }

  const handleTier2FilterChange = (value: string | undefined) => {
    setSelectedTier2Filter(value)
  }

  // 获取可用的2级子行业选项（基于选中的行业）
  const availableTier2Options = selectedIndustryFilter
    ? tier2SubIndustries.filter(si => si.industryId === selectedIndustryFilter)
    : tier2SubIndustries

  const handleCreate = () => {
    setEditingSubIndustry(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (subIndustry: SubIndustry) => {
    setEditingSubIndustry(subIndustry)
    form.setFieldsValue({
      parentSubIndustryId: subIndustry.parentSubIndustryId,
      name: subIndustry.name,
      definitionCn: subIndustry.definitionCn || subIndustry.definition || '',
      typicalGlobalCompanies: subIndustry.typicalGlobalCompanies?.join('\n') || '',
      typicalChineseCompanies: subIndustry.typicalChineseCompanies?.join('\n') || '',
      priority: subIndustry.priority || 3,
    })
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      // Parse company lists from textarea (one per line)
      const typicalGlobalCompanies = values.typicalGlobalCompanies
        ? values.typicalGlobalCompanies
            .split('\n')
            .map((c: string) => c.trim())
            .filter((c: string) => c.length > 0)
        : []

      const typicalChineseCompanies = values.typicalChineseCompanies
        ? values.typicalChineseCompanies
            .split('\n')
            .map((c: string) => c.trim())
            .filter((c: string) => c.length > 0)
        : []

      if (editingSubIndustry) {
        const updateData: UpdateSubIndustryRequest = {
          name: values.name,
          definition: values.definitionCn, // 使用中文定义作为主定义
          definitionCn: values.definitionCn,
          typicalGlobalCompanies,
          typicalChineseCompanies,
          priority: values.priority || 3,
        }
        await subIndustryService.update(editingSubIndustry.id, updateData)
        message.success('3级子行业更新成功')
      } else {
        // Get parent sub-industry to determine industryId
        const parentSubIndustry = tier2SubIndustries.find((si) => si.id === values.parentSubIndustryId)
        if (!parentSubIndustry) {
          message.error('未找到父级2级子行业')
          return
        }

        const createData: CreateSubIndustryRequest = {
          industryId: parentSubIndustry.industryId,
          name: values.name,
          definition: undefined, // 英文定义保持 null/undefined
          definitionCn: values.definitionCn,
          typicalGlobalCompanies,
          typicalChineseCompanies,
          level: 'Tier3',
          parentSubIndustryId: values.parentSubIndustryId,
          priority: values.priority || 3,
        }
        await subIndustryService.create(createData)
        message.success('3级子行业创建成功')
      }

      setModalVisible(false)
      form.resetFields()
      setEditingSubIndustry(null)
      await fetchSubIndustries()
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await subIndustryService.delete(id)
      message.success('3级子行业删除成功')
      await fetchSubIndustries()
    } catch (error: any) {
      message.error(error.message || '删除失败')
    }
  }

  const getParentSubIndustryName = (parentId?: string) => {
    if (!parentId) return '-'
    const parent = tier2SubIndustries.find((si) => si.id === parentId)
    return parent?.name || parentId
  }

  const getIndustryName = (industryId: string) => {
    const industry = industries.find((i) => i.id === industryId)
    return industry?.name || industryId
  }

  const columns = [
    {
      title: '3级子行业名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '所属2级子行业',
      dataIndex: 'parentSubIndustryId',
      key: 'parentSubIndustryId',
      width: 200,
      render: (parentId: string) => getParentSubIndustryName(parentId),
    },
    {
      title: '所属行业',
      dataIndex: 'industryId',
      key: 'industryId',
      width: 150,
      render: (industryId: string) => getIndustryName(industryId),
    },
    {
      title: '定义',
      dataIndex: 'definition',
      key: 'definition',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right' as const,
      render: (_: unknown, record: SubIndustry) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此3级子行业吗？"
            description="删除后将无法恢复。"
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
          3级子行业管理
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新增3级子行业
        </Button>
      </div>

      {/* 筛选器 */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
        <Select
          placeholder="筛选所属行业"
          style={{ width: 200 }}
          allowClear
          value={selectedIndustryFilter}
          onChange={handleIndustryFilterChange}
        >
          {industries.map((industry) => (
            <Option key={industry.id} value={industry.id}>
              {industry.name}
            </Option>
          ))}
        </Select>
        <Select
          placeholder="筛选所属2级子行业"
          style={{ width: 250 }}
          allowClear
          value={selectedTier2Filter}
          onChange={handleTier2FilterChange}
          disabled={!selectedIndustryFilter}
        >
          {availableTier2Options.map((subIndustry) => (
            <Option key={subIndustry.id} value={subIndustry.id}>
              {subIndustry.name}
            </Option>
          ))}
        </Select>
      </div>

      <Table
        columns={columns}
        dataSource={filteredTier3SubIndustries}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
        scroll={{ x: 1000 }}
      />

      <Modal
        title={editingSubIndustry ? '编辑3级子行业' : '新增3级子行业'}
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
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="parentSubIndustryId"
            label="所属2级子行业"
            rules={[{ required: true, message: '请选择所属2级子行业' }]}
          >
            <Select placeholder="请选择所属2级子行业" disabled={!!editingSubIndustry}>
              {tier2SubIndustries.map((subIndustry) => (
                <Option key={subIndustry.id} value={subIndustry.id}>
                  {getIndustryName(subIndustry.industryId)} / {subIndustry.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="name"
            label="3级子行业名称"
            rules={[
              { required: true, message: '请输入3级子行业名称' },
              { max: 100, message: '名称不能超过100个字符' },
            ]}
          >
            <Input placeholder="请输入3级子行业名称" />
          </Form.Item>
          <Form.Item
            name="definitionCn"
            label="定义"
            rules={[
              { required: true, message: '请输入定义' },
              { max: 1000, message: '定义不能超过1000个字符' },
            ]}
          >
            <TextArea rows={4} placeholder="请输入定义" />
          </Form.Item>
          <Form.Item name="typicalGlobalCompanies" label="典型国外企业" tooltip="每行输入一个企业名称">
            <TextArea rows={3} placeholder="每行输入一个企业名称，例如：&#10;Apple&#10;Microsoft&#10;Google" />
          </Form.Item>
          <Form.Item name="typicalChineseCompanies" label="典型国内企业" tooltip="每行输入一个企业名称">
            <TextArea rows={3} placeholder="每行输入一个企业名称，例如：&#10;华为&#10;腾讯&#10;阿里巴巴" />
          </Form.Item>
          <Form.Item
            name="priority"
            label="优先级"
            rules={[{ required: true, message: '请选择优先级' }]}
            initialValue={3}
            tooltip="1-5星，数字越大优先级越高"
          >
            <Select placeholder="请选择优先级">
              <Option value={1}>⭐ 1星</Option>
              <Option value={2}>⭐⭐ 2星</Option>
              <Option value={3}>⭐⭐⭐ 3星</Option>
              <Option value={4}>⭐⭐⭐⭐ 4星</Option>
              <Option value={5}>⭐⭐⭐⭐⭐ 5星</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

export default Tier3SubIndustryManagement
