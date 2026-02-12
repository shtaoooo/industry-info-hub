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
import { CustomerCase, Solution } from '../../types'
import {
  customerCaseService,
  CreateCustomerCaseRequest,
  UpdateCustomerCaseRequest,
} from '../../services/customerCaseService'
import { solutionService } from '../../services/solutionService'
import { mappingService, MappedUseCase } from '../../services/mappingService'
import { DocumentUploader } from '../../components/DocumentUploader'

const { Title } = Typography
const { TextArea } = Input
const { Option } = Select

const CustomerCaseManagement: React.FC = () => {
  const [customerCases, setCustomerCases] = useState<CustomerCase[]>([])
  const [solutions, setSolutions] = useState<Solution[]>([])
  const [useCasesForSolution, setUseCasesForSolution] = useState<MappedUseCase[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [documentModalVisible, setDocumentModalVisible] = useState(false)
  const [editingCase, setEditingCase] = useState<CustomerCase | null>(null)
  const [selectedCase, setSelectedCase] = useState<CustomerCase | null>(null)
  const [selectedSolutionId, setSelectedSolutionId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const fetchCustomerCases = useCallback(async () => {
    setLoading(true)
    try {
      const data = await customerCaseService.list()
      setCustomerCases(data)
    } catch (error: any) {
      message.error(error.message || '获取客户案例列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSolutions = useCallback(async () => {
    try {
      const data = await solutionService.list()
      setSolutions(data)
    } catch (error: any) {
      message.error(error.message || '获取解决方案列表失败')
    }
  }, [])

  const fetchUseCasesForSolution = useCallback(async (solutionId: string) => {
    try {
      const data = await mappingService.getUseCasesForSolution(solutionId)
      setUseCasesForSolution(data)
    } catch (error: any) {
      message.error(error.message || '获取用例列表失败')
      setUseCasesForSolution([])
    }
  }, [])

  useEffect(() => {
    fetchCustomerCases()
    fetchSolutions()
  }, [fetchCustomerCases, fetchSolutions])

  const handleCreate = () => {
    setEditingCase(null)
    setSelectedSolutionId(null)
    setUseCasesForSolution([])
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (customerCase: CustomerCase) => {
    setEditingCase(customerCase)
    form.setFieldsValue({
      solutionId: customerCase.solutionId,
      useCaseId: customerCase.useCaseId,
      name: customerCase.name,
      description: customerCase.description,
    })
    setSelectedSolutionId(customerCase.solutionId)
    fetchUseCasesForSolution(customerCase.solutionId)
    setModalVisible(true)
  }

  const handleManageDocuments = (customerCase: CustomerCase) => {
    setSelectedCase(customerCase)
    setDocumentModalVisible(true)
  }

  const handleSolutionChange = (solutionId: string) => {
    setSelectedSolutionId(solutionId)
    form.setFieldsValue({ useCaseId: undefined })
    fetchUseCasesForSolution(solutionId)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      if (editingCase) {
        const updateData: UpdateCustomerCaseRequest = {
          name: values.name,
          description: values.description,
        }
        await customerCaseService.update(editingCase.id, updateData)
        message.success('客户案例更新成功')
      } else {
        const createData: CreateCustomerCaseRequest = {
          solutionId: values.solutionId,
          useCaseId: values.useCaseId,
          name: values.name,
          description: values.description,
        }
        await customerCaseService.create(createData)
        message.success('客户案例创建成功')
      }

      setModalVisible(false)
      form.resetFields()
      setEditingCase(null)
      setSelectedSolutionId(null)
      setUseCasesForSolution([])
      await fetchCustomerCases()
    } catch (error: any) {
      if (error.errorFields) return // form validation error
      message.error(error.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDocumentUpload = async (fileName: string, fileContent: string, contentType: string) => {
    if (!selectedCase) return

    try {
      await customerCaseService.uploadDocument(selectedCase.id, { fileName, fileContent, contentType })
      await fetchCustomerCases()
      // Update selected case
      const updated = customerCases.find((cc) => cc.id === selectedCase.id)
      if (updated) {
        setSelectedCase(updated)
      }
    } catch (error: any) {
      throw error
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await customerCaseService.delete(id)
      message.success('客户案例删除成功')
      await fetchCustomerCases()
    } catch (error: any) {
      message.error(error.message || '删除失败')
    }
  }

  const getSolutionName = (solutionId: string) => {
    const solution = solutions.find((s) => s.id === solutionId)
    return solution?.name || solutionId
  }

  const columns = [
    {
      title: '客户案例名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '解决方案',
      dataIndex: 'solutionId',
      key: 'solutionId',
      width: 150,
      render: (solutionId: string) => <Tag color="blue">{getSolutionName(solutionId)}</Tag>,
    },
    {
      title: '用例',
      dataIndex: 'useCaseId',
      key: 'useCaseId',
      width: 150,
      render: (useCaseId: string) => <Tag color="cyan">{useCaseId.substring(0, 8)}...</Tag>,
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
      render: (_: unknown, record: CustomerCase) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" icon={<FileOutlined />} onClick={() => handleManageDocuments(record)}>
            文档
          </Button>
          <Popconfirm
            title="确定要删除此客户案例吗？"
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
          客户案例管理
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新增客户案例
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={customerCases}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
        scroll={{ x: 1200 }}
      />

      <Modal
        title={editingCase ? '编辑客户案例' : '新增客户案例'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
          setEditingCase(null)
          setSelectedSolutionId(null)
          setUseCasesForSolution([])
        }}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="solutionId"
            label="解决方案"
            rules={[{ required: true, message: '请选择解决方案' }]}
          >
            <Select
              placeholder="请选择解决方案"
              onChange={handleSolutionChange}
              disabled={!!editingCase}
              showSearch
              filterOption={(input, option) =>
                ((option?.children as unknown) as string).toLowerCase().includes(input.toLowerCase())
              }
            >
              {solutions.map((solution) => (
                <Option key={solution.id} value={solution.id}>
                  {solution.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="useCaseId" label="用例" rules={[{ required: true, message: '请选择用例' }]}>
            <Select
              placeholder={selectedSolutionId ? '请选择用例' : '请先选择解决方案'}
              disabled={!selectedSolutionId || !!editingCase}
              showSearch
              filterOption={(input, option) =>
                ((option?.children as unknown) as string).toLowerCase().includes(input.toLowerCase())
              }
            >
              {useCasesForSolution.map((useCase) => (
                <Option key={useCase.id} value={useCase.id}>
                  {useCase.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="name"
            label="客户案例名称"
            rules={[
              { required: true, message: '请输入客户案例名称' },
              { max: 100, message: '客户案例名称不能超过100个字符' },
            ]}
          >
            <Input placeholder="请输入客户案例名称" />
          </Form.Item>
          <Form.Item
            name="description"
            label="客户案例描述"
            rules={[
              { required: true, message: '请输入客户案例描述' },
              { max: 1000, message: '客户案例描述不能超过1000个字符' },
            ]}
          >
            <TextArea rows={4} placeholder="请输入客户案例描述" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`管理文档 - ${selectedCase?.name}`}
        open={documentModalVisible}
        onCancel={() => {
          setDocumentModalVisible(false)
          setSelectedCase(null)
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setDocumentModalVisible(false)
              setSelectedCase(null)
            }}
          >
            关闭
          </Button>,
        ]}
        width={700}
      >
        {selectedCase && (
          <DocumentUploader
            documents={selectedCase.documents || []}
            onUpload={handleDocumentUpload}
            onDelete={async () => {
              // Customer case documents don't have individual delete endpoint
              message.info('请通过删除客户案例来删除文档')
            }}
          />
        )}
      </Modal>
    </Card>
  )
}

export default CustomerCaseManagement
