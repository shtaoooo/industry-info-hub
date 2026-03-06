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
  Divider,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, FileOutlined } from '@ant-design/icons'
import { CustomerCase, UseCase } from '../../types'
import {
  customerCaseService,
  accountService,
  Account,
} from '../../services/customerCaseService'
import { useCaseService } from '../../services/useCaseService'
import { DocumentUploader } from '../../components/DocumentUploader'

const { Title } = Typography
const { TextArea } = Input

const CustomerCaseManagement: React.FC = () => {
  const [customerCases, setCustomerCases] = useState<CustomerCase[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [useCases, setUseCases] = useState<UseCase[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [documentModalVisible, setDocumentModalVisible] = useState(false)
  const [editingCase, setEditingCase] = useState<CustomerCase | null>(null)
  const [selectedCase, setSelectedCase] = useState<CustomerCase | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')
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

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await accountService.list()
      setAccounts(data)
    } catch (error: any) {
      console.error('获取账户列表失败:', error)
    }
  }, [])

  const fetchUseCases = useCallback(async () => {
    try {
      const data = await useCaseService.list()
      setUseCases(data)
    } catch (error: any) {
      console.error('获取用例列表失败:', error)
    }
  }, [])

  useEffect(() => {
    fetchCustomerCases()
    fetchAccounts()
    fetchUseCases()
  }, [fetchCustomerCases, fetchAccounts, fetchUseCases])

  const handleCreate = () => {
    setEditingCase(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: CustomerCase) => {
    setEditingCase(record)
    form.setFieldsValue({
      name: record.name,
      accountId: record.accountId || undefined,
      partner: record.partner || undefined,
      useCaseIds: record.useCaseIds || [],
      summary: record.summary || undefined,
    })
    setModalVisible(true)
  }

  const handleManageDocuments = (record: CustomerCase) => {
    setSelectedCase(record)
    setDocumentModalVisible(true)
  }

  const handleAddAccount = async () => {
    if (!newAccountName.trim()) return
    try {
      const newAccount = await accountService.create({ name: newAccountName.trim(), type: 'customer' })
      setAccounts([...accounts, newAccount])
      form.setFieldsValue({ accountId: newAccount.id })
      setNewAccountName('')
      message.success('客户创建成功')
    } catch (error: any) {
      message.error(error.message || '创建客户失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      // Derive industryId from selected use cases
      const selectedUseCaseIds: string[] = values.useCaseIds || []
      let industryId: string | null = null
      if (selectedUseCaseIds.length > 0) {
        const firstUseCase = useCases.find((uc) => uc.id === selectedUseCaseIds[0])
        industryId = firstUseCase?.industryId || null
      }

      const data = {
        name: values.name,
        industryId,
        accountId: values.accountId || null,
        partner: values.partner || null,
        useCaseIds: selectedUseCaseIds,
        summary: values.summary || null,
        detailMarkdown: values.detailMarkdown || null,
      }

      if (editingCase) {
        await customerCaseService.update(editingCase.id, data)
        message.success('客户案例更新成功')
      } else {
        await customerCaseService.create(data)
        message.success('客户案例创建成功')
      }

      setModalVisible(false)
      form.resetFields()
      setEditingCase(null)
      await fetchCustomerCases()
    } catch (error: any) {
      if (error.errorFields) return
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
      const updated = customerCases.find((cc) => cc.id === selectedCase.id)
      if (updated) setSelectedCase(updated)
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

  const getAccountName = (accountId?: string) => {
    if (!accountId) return '-'
    const account = accounts.find((a) => a.id === accountId)
    return account?.name || accountId
  }

  const getUseCaseNames = (useCaseIds?: string[]) => {
    if (!useCaseIds || useCaseIds.length === 0) return '-'
    return useCaseIds.map(id => {
      const uc = useCases.find(u => u.id === id)
      return uc?.name || id.substring(0, 8)
    }).join(', ')
  }

  const columns = [
    {
      title: '案例名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
    },
    {
      title: '客户',
      dataIndex: 'accountId',
      key: 'accountId',
      width: 120,
      render: (accountId?: string) => getAccountName(accountId),
    },
    {
      title: '合作伙伴',
      dataIndex: 'partner',
      key: 'partner',
      width: 120,
      render: (v?: string) => v || '-',
    },
    {
      title: '关联用例',
      dataIndex: 'useCaseIds',
      key: 'useCaseIds',
      width: 150,
      render: (useCaseIds?: string[]) => (
        <span title={getUseCaseNames(useCaseIds)}>
          {useCaseIds && useCaseIds.length > 0 ? `${useCaseIds.length} 个用例` : '-'}
        </span>
      ),
    },
    {
      title: '简要描述',
      dataIndex: 'summary',
      key: 'summary',
      ellipsis: true,
      render: (v?: string) => v || '-',
    },
    {
      title: '文档',
      dataIndex: 'documents',
      key: 'documents',
      width: 80,
      render: (documents: any[]) => documents?.length || 0,
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
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
        <Title level={4} style={{ margin: 0 }}>客户案例管理</Title>
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
        }}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="客户案例名称"
            rules={[{ required: true, message: '请输入客户案例名称' }]}
          >
            <Input placeholder="请输入客户案例名称" />
          </Form.Item>

          <Form.Item name="accountId" label="客户">
            <Select
              placeholder="请选择或搜索客户"
              showSearch
              allowClear
              filterOption={(input, option) =>
                ((option?.children as unknown) as string)?.toLowerCase().includes(input.toLowerCase())
              }
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Space style={{ padding: '0 8px 4px' }}>
                    <Input
                      placeholder="新增客户名称"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                    <Button type="text" icon={<PlusOutlined />} onClick={handleAddAccount}>
                      新增
                    </Button>
                  </Space>
                </>
              )}
            >
              {accounts.map((account) => (
                <Select.Option key={account.id} value={account.id}>
                  {account.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="partner" label="合作伙伴">
            <Input placeholder="请输入合作伙伴" />
          </Form.Item>

          <Form.Item name="useCaseIds" label="关联用例（可选，支持多选）">
            <Select
              mode="multiple"
              placeholder="请选择关联用例"
              allowClear
              maxTagCount="responsive"
              showSearch
              filterOption={(input, option) =>
                ((option?.children as unknown) as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {useCases.map((uc) => (
                <Select.Option key={uc.id} value={uc.id}>
                  {uc.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="summary" label="简要描述">
            <TextArea rows={3} placeholder="请输入简要描述" />
          </Form.Item>

          <Form.Item name="detailMarkdown" label="详细内容">
            <TextArea rows={6} placeholder="请输入详细内容（支持Markdown格式）" />
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
          <Button key="close" onClick={() => { setDocumentModalVisible(false); setSelectedCase(null) }}>
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
              message.info('请通过删除客户案例来删除文档')
            }}
          />
        )}
      </Modal>
    </Card>
  )
}

export default CustomerCaseManagement
