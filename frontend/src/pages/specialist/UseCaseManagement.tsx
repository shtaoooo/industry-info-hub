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
  Tag,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { UseCase, SubIndustry, Industry } from '../../types'
import { useCaseService, CreateUseCaseRequest, UpdateUseCaseRequest } from '../../services/useCaseService'
import { subIndustryService } from '../../services/subIndustryService'
import { industryService } from '../../services/industryService'

const { Title } = Typography
const { TextArea } = Input
const { Option } = Select

const UseCaseManagement: React.FC = () => {
  const [useCases, setUseCases] = useState<UseCase[]>([])
  const [subIndustries, setSubIndustries] = useState<SubIndustry[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingUseCase, setEditingUseCase] = useState<UseCase | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()
  const [selectedTier2, setSelectedTier2] = useState<SubIndustry | null>(null)
  const [tier3Options, setTier3Options] = useState<SubIndustry[]>([])

  const fetchUseCases = useCallback(async () => {
    setLoading(true)
    try {
      const data = await useCaseService.list()
      setUseCases(data)
    } catch (error: any) {
      message.error(error.message || '获取用例列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSubIndustries = useCallback(async () => {
    try {
      const data = await subIndustryService.listAll()
      setSubIndustries(data)
    } catch (error: any) {
      message.error(error.message || '获取子行业列表失败')
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
    fetchUseCases()
    fetchSubIndustries()
    fetchIndustries()
  }, [fetchUseCases, fetchSubIndustries, fetchIndustries])

  const handleCreate = () => {
    setEditingUseCase(null)
    form.resetFields()
    setSelectedTier2(null)
    setTier3Options([])
    setModalVisible(true)
  }

  const handleEdit = (useCase: UseCase) => {
    setEditingUseCase(useCase)
    
    // Find the sub-industry for this use case
    const subIndustry = subIndustries.find(si => si.id === useCase.subIndustryId)
    
    // If it's a Tier3, find its parent and set up the cascading selects
    if (subIndustry?.level === 'Tier3' && subIndustry.parentSubIndustryId) {
      const parentTier2 = subIndustries.find(si => si.id === subIndustry.parentSubIndustryId)
      if (parentTier2) {
        setSelectedTier2(parentTier2)
        const tier3List = subIndustries.filter(si => si.parentSubIndustryId === parentTier2.id)
        setTier3Options(tier3List)
        form.setFieldsValue({
          tier2SubIndustryId: parentTier2.id,
          tier3SubIndustryId: useCase.subIndustryId,
          name: useCase.name,
          businessScenario: useCase.businessScenario || useCase.description,
          customerPainPoints: useCase.customerPainPoints || '',
          targetAudience: useCase.targetAudience || '',
          communicationScript: useCase.communicationScript || '',
          recommendationScore: useCase.recommendationScore || 3,
        })
      }
    } else {
      // It's a Tier2 sub-industry
      setSelectedTier2(null)
      setTier3Options([])
      form.setFieldsValue({
        tier2SubIndustryId: useCase.subIndustryId,
        tier3SubIndustryId: undefined,
        name: useCase.name,
        businessScenario: useCase.businessScenario || useCase.description,
        customerPainPoints: useCase.customerPainPoints || '',
        targetAudience: useCase.targetAudience || '',
        communicationScript: useCase.communicationScript || '',
        recommendationScore: useCase.recommendationScore || 3,
      })
    }
    
    setModalVisible(true)
  }

  const handleTier2Change = (tier2Id: string) => {
    const tier2 = subIndustries.find(si => si.id === tier2Id)
    setSelectedTier2(tier2 || null)
    
    // Clear Tier3 selection
    form.setFieldValue('tier3SubIndustryId', undefined)
    
    // If it's a Tier2-Group, load Tier3 options
    if (tier2?.level === 'Tier2-Group') {
      const tier3List = subIndustries.filter(si => si.parentSubIndustryId === tier2Id)
      setTier3Options(tier3List)
    } else {
      setTier3Options([])
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      // Determine the actual subIndustryId to use
      const finalSubIndustryId = values.tier3SubIndustryId || values.tier2SubIndustryId

      if (editingUseCase) {
        const updateData: UpdateUseCaseRequest = {
          subIndustryId: finalSubIndustryId,
          name: values.name,
          description: values.businessScenario, // 保持向后兼容
          businessScenario: values.businessScenario,
          customerPainPoints: values.customerPainPoints,
          targetAudience: values.targetAudience,
          communicationScript: values.communicationScript,
          recommendationScore: values.recommendationScore,
        }
        await useCaseService.update(editingUseCase.id, updateData)
        message.success('用例更新成功')
      } else {
        const createData: CreateUseCaseRequest = {
          subIndustryId: finalSubIndustryId,
          name: values.name,
          description: values.businessScenario, // 保持向后兼容
          businessScenario: values.businessScenario,
          customerPainPoints: values.customerPainPoints,
          targetAudience: values.targetAudience,
          communicationScript: values.communicationScript,
          recommendationScore: values.recommendationScore,
        }
        await useCaseService.create(createData)
        message.success('用例创建成功')
      }

      setModalVisible(false)
      form.resetFields()
      setEditingUseCase(null)
      setSelectedTier2(null)
      setTier3Options([])
      await fetchUseCases()
    } catch (error: any) {
      if (error.errorFields) return // form validation error
      message.error(error.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await useCaseService.delete(id)
      message.success('用例删除成功')
      await fetchUseCases()
    } catch (error: any) {
      message.error(error.message || '删除失败')
    }
  }

  const getSubIndustryName = (subIndustryId: string) => {
    const subIndustry = subIndustries.find((si) => si.id === subIndustryId)
    return subIndustry?.name || subIndustryId
  }

  const getIndustryName = (industryId: string) => {
    const industry = industries.find((i) => i.id === industryId)
    return industry?.name || industryId
  }

  const columns = [
    {
      title: '用例名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '所属行业',
      dataIndex: 'industryId',
      key: 'industryId',
      width: 150,
      render: (industryId: string) => <Tag color="blue">{getIndustryName(industryId)}</Tag>,
    },
    {
      title: '所属子行业',
      dataIndex: 'subIndustryId',
      key: 'subIndustryId',
      width: 300,
      render: (subIndustryId: string) => <Tag color="cyan">{getSubIndustryName(subIndustryId)}</Tag>,
    },
    {
      title: '推荐指数',
      dataIndex: 'recommendationScore',
      key: 'recommendationScore',
      width: 150,
      render: (score: number) => {
        const displayScore = score || 3
        return (
          <div>
            {Array.from({ length: 5 }, (_, i) => (
              <span
                key={i}
                style={{
                  color: i < displayScore ? '#ffb800' : '#d2d2d7',
                  marginRight: 2,
                }}
              >
                ⭐
              </span>
            ))}
            <span style={{ marginLeft: 4, color: '#6e6e73' }}>({displayScore})</span>
          </div>
        )
      },
    },
    {
      title: '切入人群',
      dataIndex: 'targetAudience',
      key: 'targetAudience',
      width: 200,
      render: (text: string) => text || '-',
    },
    {
      title: '文档数量',
      dataIndex: 'documents',
      key: 'documents',
      width: 100,
      render: (documents: any[]) => documents?.length || 0,
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
      fixed: 'right' as const,
      render: (_: unknown, record: UseCase) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此用例吗？"
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
          用例管理
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新增用例
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={useCases}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
        scroll={{ x: 1200 }}
      />

      <Modal
        title={editingUseCase ? '编辑用例' : '新增用例'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
          setEditingUseCase(null)
        }}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="tier2SubIndustryId"
            label="所属子行业 (Tier2)"
            rules={[{ required: true, message: '请选择所属子行业' }]}
          >
            <Select 
              placeholder="请选择Tier2子行业" 
              onChange={handleTier2Change}
            >
              {subIndustries
                .filter(si => si.level === 'Tier2-individual' || si.level === 'Tier2-Group')
                .map((subIndustry) => (
                  <Option key={subIndustry.id} value={subIndustry.id}>
                    {getIndustryName(subIndustry.industryId)} / {subIndustry.name}
                    {subIndustry.level === 'Tier2-Group' && ' (包含Tier3子行业)'}
                  </Option>
                ))}
            </Select>
          </Form.Item>
          
          {selectedTier2?.level === 'Tier2-Group' && tier3Options.length > 0 && (
            <Form.Item
              name="tier3SubIndustryId"
              label="所属子行业 (Tier3)"
              rules={[{ required: true, message: '请选择Tier3子行业' }]}
            >
              <Select 
                placeholder="请选择Tier3子行业"
              >
                {tier3Options.map((subIndustry) => (
                  <Option key={subIndustry.id} value={subIndustry.id}>
                    {subIndustry.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
          <Form.Item
            name="name"
            label="用例名称"
            rules={[
              { required: true, message: '请输入用例名称' },
              { max: 100, message: '用例名称不能超过100个字符' },
            ]}
          >
            <Input placeholder="请输入用例名称" />
          </Form.Item>
          <Form.Item
            name="businessScenario"
            label="业务场景"
            rules={[
              { required: true, message: '请输入业务场景' },
              { max: 1000, message: '业务场景不能超过1000个字符' },
            ]}
          >
            <TextArea rows={4} placeholder="请输入业务场景" />
          </Form.Item>
          <Form.Item
            name="customerPainPoints"
            label="客户痛点"
            rules={[{ max: 1000, message: '客户痛点不能超过1000个字符' }]}
          >
            <TextArea rows={4} placeholder="请输入客户痛点" />
          </Form.Item>
          <Form.Item
            name="recommendationScore"
            label="推荐指数"
            rules={[{ required: true, message: '请选择推荐指数' }]}
            initialValue={3}
          >
            <Select placeholder="请选择推荐指数">
              <Option value={5}>⭐⭐⭐⭐⭐ (5星 - 强烈推荐)</Option>
              <Option value={4}>⭐⭐⭐⭐ (4星 - 推荐)</Option>
              <Option value={3}>⭐⭐⭐ (3星 - 一般)</Option>
              <Option value={2}>⭐⭐ (2星 - 较少推荐)</Option>
              <Option value={1}>⭐ (1星 - 不推荐)</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="targetAudience"
            label="切入人群"
            rules={[{ max: 500, message: '切入人群不能超过500个字符' }]}
          >
            <TextArea rows={3} placeholder="请输入切入人群" />
          </Form.Item>
          <Form.Item
            name="communicationScript"
            label="沟通话术"
            rules={[{ max: 500, message: '沟通话术不能超过500个字符' }]}
          >
            <TextArea rows={3} placeholder="请输入沟通话术" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

export default UseCaseManagement
