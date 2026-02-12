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
import { PlusOutlined, EditOutlined, DeleteOutlined, FileOutlined } from '@ant-design/icons'
import { UseCase, SubIndustry, Industry } from '../../types'
import { useCaseService, CreateUseCaseRequest, UpdateUseCaseRequest } from '../../services/useCaseService'
import { subIndustryService } from '../../services/subIndustryService'
import { industryService } from '../../services/industryService'
import { DocumentUploader } from '../../components/DocumentUploader'

const { Title } = Typography
const { TextArea } = Input
const { Option } = Select

const UseCaseManagement: React.FC = () => {
  const [useCases, setUseCases] = useState<UseCase[]>([])
  const [subIndustries, setSubIndustries] = useState<SubIndustry[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [documentModalVisible, setDocumentModalVisible] = useState(false)
  const [editingUseCase, setEditingUseCase] = useState<UseCase | null>(null)
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

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
    setModalVisible(true)
  }

  const handleEdit = (useCase: UseCase) => {
    setEditingUseCase(useCase)
    form.setFieldsValue({
      subIndustryId: useCase.subIndustryId,
      name: useCase.name,
      description: useCase.description,
    })
    setModalVisible(true)
  }

  const handleManageDocuments = (useCase: UseCase) => {
    setSelectedUseCase(useCase)
    setDocumentModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      if (editingUseCase) {
        const updateData: UpdateUseCaseRequest = {
          name: values.name,
          description: values.description,
        }
        await useCaseService.update(editingUseCase.id, updateData)
        message.success('用例更新成功')
      } else {
        const createData: CreateUseCaseRequest = {
          subIndustryId: values.subIndustryId,
          name: values.name,
          description: values.description,
        }
        await useCaseService.create(createData)
        message.success('用例创建成功')
      }

      setModalVisible(false)
      form.resetFields()
      setEditingUseCase(null)
      await fetchUseCases()
    } catch (error: any) {
      if (error.errorFields) return // form validation error
      message.error(error.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDocumentUpload = async (fileName: string, fileContent: string, contentType: string) => {
    if (!selectedUseCase) return

    try {
      await useCaseService.uploadDocument(selectedUseCase.id, { fileName, fileContent, contentType })
      await fetchUseCases()
      // Update selected use case
      const updated = useCases.find((uc) => uc.id === selectedUseCase.id)
      if (updated) {
        setSelectedUseCase(updated)
      }
    } catch (error: any) {
      throw error
    }
  }

  const handleDocumentDelete = async (docId: string) => {
    if (!selectedUseCase) return

    try {
      await useCaseService.deleteDocument(selectedUseCase.id, docId)
      await fetchUseCases()
      // Update selected use case
      const updated = useCases.find((uc) => uc.id === selectedUseCase.id)
      if (updated) {
        setSelectedUseCase(updated)
      }
    } catch (error: any) {
      throw error
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
      width: 150,
      render: (subIndustryId: string) => <Tag color="cyan">{getSubIndustryName(subIndustryId)}</Tag>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
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
      width: 250,
      fixed: 'right' as const,
      render: (_: unknown, record: UseCase) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" icon={<FileOutlined />} onClick={() => handleManageDocuments(record)}>
            文档
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
            name="subIndustryId"
            label="所属子行业"
            rules={[{ required: true, message: '请选择所属子行业' }]}
          >
            <Select placeholder="请选择所属子行业" disabled={!!editingUseCase}>
              {subIndustries.map((subIndustry) => (
                <Option key={subIndustry.id} value={subIndustry.id}>
                  {getIndustryName(subIndustry.industryId)} / {subIndustry.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
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
            name="description"
            label="用例描述"
            rules={[
              { required: true, message: '请输入用例描述' },
              { max: 1000, message: '用例描述不能超过1000个字符' },
            ]}
          >
            <TextArea rows={4} placeholder="请输入用例描述" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`管理文档 - ${selectedUseCase?.name}`}
        open={documentModalVisible}
        onCancel={() => {
          setDocumentModalVisible(false)
          setSelectedUseCase(null)
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setDocumentModalVisible(false)
              setSelectedUseCase(null)
            }}
          >
            关闭
          </Button>,
        ]}
        width={700}
      >
        {selectedUseCase && (
          <DocumentUploader
            documents={selectedUseCase.documents || []}
            onUpload={handleDocumentUpload}
            onDelete={handleDocumentDelete}
          />
        )}
      </Modal>
    </Card>
  )
}

export default UseCaseManagement
